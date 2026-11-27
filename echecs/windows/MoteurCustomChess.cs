// Moteur Custom Chess pour Windows : fait tourner le vrai Stockfish (version Windows officielle, gratuite, GPL)
// sur presque tous les cœurs du PC, et le prête au jeu Custom Chess (page web) par un WebSocket local :
// ws://127.0.0.1:57613/ . Une connexion = un Stockfish.
// Il sert aussi le jeu lui-même à http://localhost:57613/ (copie du site JulGames gardée sur le PC) : le jeu et
// le moteur sont alors au même endroit, et aucun navigateur ne bloque la connexion.
// Au premier lancement, Stockfish est téléchargé depuis github.com/official-stockfish (≈ 80 Mo).
// Compilation : csc /target:winexe /out:MoteurCustomChess.exe /r:System.IO.Compression.dll
//   /r:System.IO.Compression.FileSystem.dll /r:System.Windows.Forms.dll /r:System.Drawing.dll MoteurCustomChess.cs
using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

static class MoteurCustomChess
{
    const int PORT = 57613;
    const string URL_SF = "https://github.com/official-stockfish/Stockfish/releases/download/sf_19/stockfish-windows-x86-64-universal.zip";
    static readonly string Dossier = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CustomChess");
    static string cheminSf;
    static NotifyIcon icone;
    static int connexions = 0;

    [STAThread]
    static void Main()
    {
        Application.EnableVisualStyles();
        TcpListener ecoute;
        try { ecoute = new TcpListener(IPAddress.Loopback, PORT); ecoute.Start(); }
        catch { MessageBox.Show("Le moteur Custom Chess est déjà lancé (regarde les icônes près de l'horloge).", "Moteur Custom Chess"); return; }

        icone = new NotifyIcon { Icon = SystemIcons.Application, Visible = true, Text = "Moteur Custom Chess : préparation…" };
        var menu = new ContextMenuStrip();
        var auto = new ToolStripMenuItem("Lancer avec Windows") { Checked = LanceAvecWindows(), CheckOnClick = true };
        auto.CheckedChanged += (s, e) => ChangerLancement(auto.Checked);
        menu.Items.Add(new ToolStripMenuItem("Ouvrir Custom Chess", null, (s, e) => Process.Start("http://localhost:" + PORT + "/")));
        icone.DoubleClick += (s, e) => Process.Start("http://localhost:" + PORT + "/");
        menu.Items.Add(auto);
        menu.Items.Add(new ToolStripMenuItem("Quitter", null, (s, e) => { icone.Visible = false; Environment.Exit(0); }));
        icone.ContextMenuStrip = menu;

        new Thread(() =>
        {
            try { cheminSf = TrouverStockfish(); }
            catch (Exception ex) { Bulle("Impossible de préparer Stockfish : " + ex.Message, ToolTipIcon.Error); return; }
            MajTexte();
            Bulle("Prêt : Stockfish sur " + Environment.ProcessorCount + " cœurs. Double-clique ici pour ouvrir le jeu.", ToolTipIcon.Info);
            while (true)
            {
                TcpClient c = ecoute.AcceptTcpClient();
                new Thread(() => Servir(c)) { IsBackground = true }.Start();
            }
        }) { IsBackground = true }.Start();
        Application.Run();
    }

    static void Bulle(string t, ToolTipIcon i) { try { icone.ShowBalloonTip(4000, "Moteur Custom Chess", t, i); } catch { } }
    static void MajTexte()
    {
        string t = "Moteur Custom Chess : " + (connexions > 0 ? connexions + " calcul(s) en cours" : "prêt") + " (" + Environment.ProcessorCount + " cœurs)";
        try { icone.Text = t.Length > 63 ? t.Substring(0, 63) : t; } catch { }
    }

    // ---------- Stockfish : à côté du programme, dans %LOCALAPPDATA%\CustomChess, sinon téléchargé ----------
    static string TrouverStockfish()
    {
        string ici = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "stockfish.exe");
        if (File.Exists(ici)) return ici;
        string la = Path.Combine(Dossier, "stockfish.exe");
        if (File.Exists(la)) return la;
        Directory.CreateDirectory(Dossier);
        Bulle("Premier lancement : téléchargement de Stockfish (≈ 80 Mo)…", ToolTipIcon.Info);
        icone.Text = "Moteur Custom Chess : téléchargement de Stockfish…";
        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; // TLS 1.2
        string zip = Path.Combine(Dossier, "stockfish.zip");
        using (var w = new WebClient()) w.DownloadFile(URL_SF, zip);
        using (var z = ZipFile.OpenRead(zip))
        {
            foreach (var e in z.Entries)
                if (e.FullName.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) { e.ExtractToFile(la, true); break; }
        }
        File.Delete(zip);
        if (!File.Exists(la)) throw new Exception("stockfish.exe introuvable dans le fichier téléchargé");
        return la;
    }

    // ---------- lancement automatique (seulement si l'utilisateur coche la case) ----------
    const string CLE_RUN = @"Software\Microsoft\Windows\CurrentVersion\Run";
    static bool LanceAvecWindows()
    {
        using (var k = Registry.CurrentUser.OpenSubKey(CLE_RUN)) return k != null && k.GetValue("MoteurCustomChess") != null;
    }
    static void ChangerLancement(bool oui)
    {
        using (var k = Registry.CurrentUser.OpenSubKey(CLE_RUN, true))
        {
            if (oui) k.SetValue("MoteurCustomChess", "\"" + Application.ExecutablePath + "\"");
            else k.DeleteValue("MoteurCustomChess", false);
        }
    }

    // ---------- une connexion WebSocket = un Stockfish ----------
    static bool OrigineOk(string o)
    {
        if (o == null) return false;
        o = o.Trim().ToLowerInvariant();
        return o == "https://juldorange1.github.io" || o.StartsWith("http://localhost:") || o.StartsWith("http://127.0.0.1:") || o == "http://localhost" || o == "http://127.0.0.1";
    }

    static void Servir(TcpClient client)
    {
        Process sf = null;
        try
        {
            client.NoDelay = true;
            var flux = client.GetStream();
            // poignée de main HTTP -> WebSocket
            var entete = new StringBuilder();
            var tampon = new byte[1];
            while (!entete.ToString().EndsWith("\r\n\r\n"))
            {
                if (flux.Read(tampon, 0, 1) != 1 || entete.Length > 8192) return;
                entete.Append((char)tampon[0]);
            }
            string cle = null, origine = null;
            foreach (var l in entete.ToString().Split(new[] { "\r\n" }, StringSplitOptions.None))
            {
                int i = l.IndexOf(':'); if (i < 0) continue;
                string n = l.Substring(0, i).Trim().ToLowerInvariant(), v = l.Substring(i + 1).Trim();
                if (n == "sec-websocket-key") cle = v;
                if (n == "origin") origine = v;
            }
            if (cle == null)
            {
                ServirFichier(flux, entete.ToString());
                return;
            }
            if (!OrigineOk(origine))
            {
                var refus = Encoding.ASCII.GetBytes("HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\n\r\n");
                flux.Write(refus, 0, refus.Length); return;
            }
            string acc;
            using (var sha = SHA1.Create()) acc = Convert.ToBase64String(sha.ComputeHash(Encoding.ASCII.GetBytes(cle + "258EAFA5-E914-47DA-95CA-C5AB0DC85B11")));
            var rep = Encoding.ASCII.GetBytes("HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: " + acc + "\r\n\r\n");
            flux.Write(rep, 0, rep.Length);

            object verrou = new object();
            Action<string> envoyer = (t) =>
            {
                byte[] d = Encoding.UTF8.GetBytes(t);
                var f = new MemoryStream();
                f.WriteByte(0x81);
                if (d.Length < 126) f.WriteByte((byte)d.Length);
                else if (d.Length < 65536) { f.WriteByte(126); f.WriteByte((byte)(d.Length >> 8)); f.WriteByte((byte)d.Length); }
                else { f.WriteByte(127); for (int k = 7; k >= 0; k--) f.WriteByte((byte)((long)d.Length >> (8 * k))); }
                f.Write(d, 0, d.Length);
                var b = f.ToArray();
                lock (verrou) flux.Write(b, 0, b.Length);
            };

            sf = new Process
            {
                StartInfo = new ProcessStartInfo(cheminSf)
                {
                    UseShellExecute = false, CreateNoWindow = true,
                    RedirectStandardInput = true, RedirectStandardOutput = true, WorkingDirectory = Path.GetDirectoryName(cheminSf)
                }
            };
            sf.OutputDataReceived += (s, e) => { if (e.Data != null) { try { envoyer(e.Data); } catch { } } };
            sf.Start();
            try { sf.PriorityClass = ProcessPriorityClass.BelowNormal; } catch { } // le PC reste fluide
            sf.BeginOutputReadLine();
            Interlocked.Increment(ref connexions); MajTexte();
            envoyer("custom-chess-moteur 1 coeurs=" + Environment.ProcessorCount);

            // messages du jeu -> Stockfish
            while (true)
            {
                int b0 = flux.ReadByte(), b1 = flux.ReadByte();
                if (b0 < 0 || b1 < 0) break;
                int op = b0 & 0x0F;
                long lg = b1 & 0x7F;
                if (lg == 126) lg = (flux.ReadByte() << 8) | flux.ReadByte();
                else if (lg == 127) { lg = 0; for (int k = 0; k < 8; k++) lg = (lg << 8) | (long)(uint)flux.ReadByte(); }
                byte[] masque = new byte[4];
                if ((b1 & 0x80) != 0) LireTout(flux, masque, 4);
                if (lg > 1 << 20) break;
                byte[] data = new byte[lg];
                LireTout(flux, data, (int)lg);
                if ((b1 & 0x80) != 0) for (int k = 0; k < lg; k++) data[k] ^= masque[k % 4];
                if (op == 8) break;                      // fermeture
                if (op == 9) { lock (verrou) { var pong = new byte[] { 0x8A, 0 }; flux.Write(pong, 0, 2); } continue; }
                if (op != 1) continue;
                foreach (var ligne in Encoding.UTF8.GetString(data).Split('\n'))
                    if (ligne.Trim().Length > 0) { sf.StandardInput.WriteLine(ligne.Trim()); sf.StandardInput.Flush(); }
            }
        }
        catch { }
        finally
        {
            if (sf != null)
            {
                Interlocked.Decrement(ref connexions); MajTexte();
                try { sf.StandardInput.WriteLine("quit"); if (!sf.WaitForExit(1500)) sf.Kill(); } catch { }
            }
            try { client.Close(); } catch { }
        }
    }

    // ---------- le jeu servi depuis le PC : copie du site, mise à jour à chaque ouverture ----------
    const string SITE = "https://juldorange1.github.io/JulGames/echecs/";
    static readonly string Cache = Path.Combine(Dossier, "site");
    static void ServirFichier(Stream flux, string entete)
    {
        string premiere = entete.Split(new[] { "\r\n" }, StringSplitOptions.None)[0];
        string[] m = premiere.Split(' ');
        string chemin = m.Length > 1 ? m[1] : "/";
        int q = chemin.IndexOf('?'); if (q >= 0) chemin = chemin.Substring(0, q);
        q = chemin.IndexOf('#'); if (q >= 0) chemin = chemin.Substring(0, q);
        chemin = Uri.UnescapeDataString(chemin).TrimStart('/');
        if (chemin == "" || chemin.EndsWith("/")) chemin += "index.html";
        bool sur = chemin.Length < 200 && !chemin.Contains("..") && !chemin.Contains("\\") && !chemin.Contains(":");
        foreach (char c in chemin) if (!(char.IsLetterOrDigit(c) || c == '/' || c == '.' || c == '-' || c == '_')) sur = false;
        byte[] corps = null;
        if (sur)
        {
            string local = Path.Combine(Cache, chemin.Replace('/', Path.DirectorySeparatorChar));
            bool gros = chemin.EndsWith(".wasm") || chemin.EndsWith(".json") || chemin.EndsWith(".tsv");
            // gros fichiers : la copie du PC d'abord ; le reste : le site d'abord (toujours à jour), la copie si pas d'internet
            if (gros && File.Exists(local)) corps = File.ReadAllBytes(local);
            if (corps == null)
            {
                try
                {
                    using (var w = new WebClient())
                    {
                        ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
                        w.Headers[HttpRequestHeader.CacheControl] = "no-cache";
                        corps = w.DownloadData(SITE + chemin + (gros ? "" : "?t=" + DateTime.UtcNow.Ticks));
                    }
                    Directory.CreateDirectory(Path.GetDirectoryName(local));
                    File.WriteAllBytes(local, corps);
                }
                catch { if (File.Exists(local)) corps = File.ReadAllBytes(local); }
            }
        }
        string type = TypeDe(chemin);
        var sb = new StringBuilder();
        if (corps == null) sb.Append("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n");
        else sb.Append("HTTP/1.1 200 OK\r\nContent-Type: " + type + "\r\nContent-Length: " + corps.Length + "\r\n");
        sb.Append("Cross-Origin-Opener-Policy: same-origin\r\nCross-Origin-Embedder-Policy: require-corp\r\nCross-Origin-Resource-Policy: same-origin\r\n");
        sb.Append("Cache-Control: no-cache\r\nConnection: close\r\n\r\n");
        var h = Encoding.ASCII.GetBytes(sb.ToString());
        flux.Write(h, 0, h.Length);
        if (corps != null) flux.Write(corps, 0, corps.Length);
        flux.Flush();
    }
    static string TypeDe(string c)
    {
        string e = Path.GetExtension(c).ToLowerInvariant();
        switch (e)
        {
            case ".html": return "text/html; charset=utf-8";
            case ".js": return "text/javascript; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".json": return "application/json";
            case ".wasm": return "application/wasm";
            case ".svg": return "image/svg+xml";
            case ".png": return "image/png";
            case ".jpg": return "image/jpeg";
            case ".webp": return "image/webp";
            case ".txt": case ".tsv": case ".md": return "text/plain; charset=utf-8";
            case ".exe": return "application/octet-stream";
            default: return "application/octet-stream";
        }
    }

    static void LireTout(Stream s, byte[] b, int n)
    {
        int lu = 0;
        while (lu < n) { int r = s.Read(b, lu, n - lu); if (r <= 0) throw new IOException("fin"); lu += r; }
    }
}
