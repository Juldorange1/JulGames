'use strict';
/* Colosses — traductions : nouvelles armes, nouvelles attaques et variantes, barres de durée des modes. */
(function () {
const T = {
  en: {
    p: {
      bombeCollante: ['Sticky Bombs', 'Bombs that stick to the boss and explode a second later (area damage).'],
      helice: ['Helix Lance', 'Two projectiles coil around each other: a thin, very fast helix.'],
      focale: ['Converging Rays', 'Five rays fan out and cross exactly on the crosshair: put the crosshair ON the boss to land them all.'],
      toupie: ['Cutting Top', 'Throws a top that flies to the crosshair, then spins in place for 1.6 s, slicing everything it touches.'],
      croissant: ['Lunar Crescent', 'A large, slow crescent that passes through everything it hits: perfect for bosses and their summons.'],
      acide: ['Acid Spit', 'A lobbed spit that leaves a pool of acid on the crosshair for 2.5 s: the boss corrodes in it.'],
      meteorite: ['Charged Meteorite', 'Hold to grow the meteorite, release: it lands on the crosshair half a second later. Full charge: huge, and it erases projectiles. 0.6 s cooldown between meteorites.']
    },
    s: {
      tornade: ['Tornado', 'A tornado moves toward the crosshair for 3 s: it hits nonstop and swallows the bullets it touches.'],
      mines: ['Minefield', 'Three mines around the crosshair: they explode when the boss walks over them (or after 5 s).'],
      lanceSoleil: ['Solar Lance', 'A lance of light crosses the whole arena in the aimed direction, after a short warning flash.'],
      orage: ['Thunderstorm', 'Twelve lightning bolts strike around the crosshair over 2 seconds.']
    },
    t: {
      tourbillon: ['Whirlwind', 'A spinning dash (invincible): on arrival, nearby bullets are swept away.'],
      zigzag: ['Zigzag', 'Two tiny, very fast zigzag hops (invincible): ideal to cross a wall of bullets.']
    },
    atk: {
      spiraleFrappes: ['Strike Spiral', 'Circles light up in a spiral starting from you, one after another: walk against the spiral, toward circles that already struck.'],
      cible: ['Target', 'Three rings around you strike from the center outward, then the center strikes again: step out right after the first strike, then come back to the center.'],
      cometes: ['Comets', 'Three comets cross the arena one after another, each announced by a wide band: leave the band as soon as it appears.'],
      murMarche: ['Marching Wall', 'Bands strike from one edge to the other and their gap shifts a little each time: follow the gap as you walk.'],
      geyserSuiveur: ['Chasing Geysers', 'A geyser is announced under your feet every 0.3 s, seven times: never stop, change direction now and then.'],
      etoileFilante: ['Shooting Star', 'The boss crosses the arena in a straight line three times; each pass is announced by a line: step away from the line.'],
      tourbillonBalles: ['Whirlpool', 'A ring of bullets forms at the edge and spins as it tightens toward the boss: stand in front of the gap and let it pass over you.'],
      rayonsJumeaux: ['Twin Beams', 'Two beams start toward you then spread to each side (the pale area shows the whole arc): go behind the boss or leave the arc.'],
      vagueZonesDouble: ['Double Strike Wave', 'A wave of vertical bands then a horizontal one: find the gap of the first, then of the second.'],
      piliersCercle: ['Ring of Pillars', 'Eight circles light up around you then become fire columns: leave the circles and keep a clear path.'],
      pluieCroisee: ['Crossed Starfall', 'Two starfalls at right angles, one after the other: slip between the lines of the first, then of the second.'],
      laserRafale: ['Laser Barrage', 'Five shots in a row: the line follows you then freezes (white). Sidestep each time the line turns white.']
    },
    frag: [['Nouveau record !', 'New record!'], ['Premier essai', 'First attempt'], ['Temps restant', 'Time left'], [' selon tes armes', ' from your weapons'], [' · en cours : ', ' · in progress: '], [' (reprendre)', ' (resume)'], ['1 PV : le moindre coup est fatal', '1 HP: any hit is fatal'], ['Record ', 'Record ']]
  },
  es: {
    p: {
      bombeCollante: ['Bombas adhesivas', 'Bombas que se pegan al jefe y explotan un segundo después (daño en área).'],
      helice: ['Lanza hélice', 'Dos proyectiles se enroscan uno alrededor del otro: una hélice fina y muy rápida.'],
      focale: ['Rayos convergentes', 'Cinco rayos salen en abanico y se cruzan justo en la mira: pon la mira SOBRE el jefe para que todos acierten.'],
      toupie: ['Peonza cortante', 'Lanza una peonza que vuela hasta la mira y gira en el sitio 1,6 s cortando todo lo que toca.'],
      croissant: ['Media luna', 'Una gran media luna lenta que atraviesa todo lo que toca: perfecta para los jefes y sus invocaciones.'],
      acide: ['Escupitajo ácido', 'Un escupitajo en parábola que deja un charco de ácido 2,5 s en la mira: el jefe se corroe dentro.'],
      meteorite: ['Meteorito cargado', 'Mantén para hacer crecer el meteorito y suelta: cae en la mira medio segundo después. Carga completa: enorme, y borra los proyectiles. 0,6 s de recarga entre meteoritos.']
    },
    s: {
      tornade: ['Tornado', 'Un tornado avanza hacia la mira durante 3 s: golpea sin parar y se traga las balas que toca.'],
      mines: ['Campo de minas', 'Tres minas alrededor de la mira: explotan cuando el jefe pasa por encima (o a los 5 s).'],
      lanceSoleil: ['Lanza solar', 'Una lanza de luz atraviesa toda la arena en la dirección apuntada, tras un breve destello de aviso.'],
      orage: ['Tormenta', 'Doce rayos caen alrededor de la mira durante 2 segundos.']
    },
    t: {
      tourbillon: ['Torbellino', 'Una embestida girando (invencible): al llegar, barre las balas cercanas.'],
      zigzag: ['Zigzag', 'Dos saltitos muy rápidos en zigzag (invencible): ideal para cruzar un muro de balas.']
    },
    atk: {
      spiraleFrappes: ['Espiral de golpes', 'Unos círculos se encienden en espiral desde ti, uno tras otro: camina en sentido contrario a la espiral, hacia los círculos que ya golpearon.'],
      cible: ['Diana', 'Tres anillos a tu alrededor golpean del centro hacia fuera y luego el centro vuelve a golpear: sal justo tras el primer golpe y vuelve al centro.'],
      cometes: ['Cometas', 'Tres cometas cruzan la arena una tras otra, cada una anunciada por una banda ancha: sal de la banda en cuanto aparezca.'],
      murMarche: ['Muro en marcha', 'Unas bandas golpean de un borde al otro y su hueco se desplaza un poco cada vez: sigue el hueco caminando.'],
      geyserSuiveur: ['Géiseres perseguidores', 'Se anuncia un géiser bajo tus pies cada 0,3 s, siete veces: no te detengas y cambia de dirección de vez en cuando.'],
      etoileFilante: ['Estrella fugaz', 'El jefe cruza la arena en línea recta tres veces; cada pasada se anuncia con una línea: apártate de la línea.'],
      tourbillonBalles: ['Remolino', 'Se forma un anillo de balas en el borde que gira y se cierra hacia el jefe: ponte frente al hueco y deja que pase sobre ti.'],
      rayonsJumeaux: ['Rayos gemelos', 'Dos rayos salen hacia ti y luego se separan cada uno hacia un lado (la zona pálida muestra todo el arco): ponte detrás del jefe o sal del arco.'],
      vagueZonesDouble: ['Doble oleada de golpes', 'Una oleada de bandas verticales y luego una horizontal: encuentra el hueco de la primera y luego el de la segunda.'],
      piliersCercle: ['Círculo de pilares', 'Ocho círculos se encienden a tu alrededor y se convierten en columnas de fuego: sal de los círculos y deja un camino libre.'],
      pluieCroisee: ['Lluvia de estrellas cruzada', 'Dos lluvias de estrellas en ángulo recto, una tras otra: deslízate entre las líneas de la primera y luego de la segunda.'],
      laserRafale: ['Ráfaga láser', 'Cinco disparos seguidos: la línea te sigue y se fija (blanca). Da un paso al lado cada vez que se vuelva blanca.']
    },
    frag: [['Nouveau record !', '¡Nuevo récord!'], ['Premier essai', 'Primer intento'], ['Temps restant', 'Tiempo restante'], [' selon tes armes', ' según tus armas'], [' · en cours : ', ' · en curso: '], [' (reprendre)', ' (continuar)'], ['1 PV : le moindre coup est fatal', '1 PV: cualquier golpe es mortal'], ['Record ', 'Récord ']]
  },
  de: {
    p: {
      bombeCollante: ['Haftbomben', 'Bomben, die am Boss kleben und eine Sekunde später explodieren (Flächenschaden).'],
      helice: ['Helixlanze', 'Zwei Geschosse winden sich umeinander: eine feine, sehr schnelle Helix.'],
      focale: ['Bündelstrahlen', 'Fünf Strahlen fächern auf und kreuzen sich genau am Fadenkreuz: setz das Fadenkreuz AUF den Boss, damit alle treffen.'],
      toupie: ['Schneidkreisel', 'Wirft einen Kreisel, der zum Fadenkreuz fliegt und sich dort 1,6 s dreht und alles zerschneidet, was er berührt.'],
      croissant: ['Mondsichel', 'Eine große, langsame Sichel, die durch alles hindurchgeht: perfekt für Bosse und ihre Beschwörungen.'],
      acide: ['Säurespucke', 'Ein Bogenwurf, der 2,5 s lang eine Säurepfütze am Fadenkreuz hinterlässt: der Boss zerfrisst sich darin.'],
      meteorite: ['Geladener Meteorit', 'Halten, um den Meteoriten wachsen zu lassen, loslassen: er schlägt eine halbe Sekunde später am Fadenkreuz ein. Volle Ladung: riesig, und er löscht Geschosse. 0,6 s Abklingzeit zwischen zwei Meteoriten.']
    },
    s: {
      tornade: ['Tornado', 'Ein Tornado zieht 3 s lang zum Fadenkreuz: er trifft ununterbrochen und verschluckt die Kugeln, die er berührt.'],
      mines: ['Minenfeld', 'Drei Minen um das Fadenkreuz: sie explodieren, wenn der Boss darüberläuft (oder nach 5 s).'],
      lanceSoleil: ['Sonnenlanze', 'Eine Lichtlanze durchquert nach einem kurzen Warnblitz die ganze Arena in Zielrichtung.'],
      orage: ['Gewitter', 'Zwölf Blitze schlagen 2 Sekunden lang um das Fadenkreuz ein.']
    },
    t: {
      tourbillon: ['Wirbelwind', 'Ein drehender Sprint (unverwundbar): bei der Ankunft werden nahe Kugeln weggefegt.'],
      zigzag: ['Zickzack', 'Zwei winzige, sehr schnelle Zickzack-Sprünge (unverwundbar): ideal, um eine Kugelwand zu durchqueren.']
    },
    atk: {
      spiraleFrappes: ['Schlagspirale', 'Kreise leuchten in einer Spirale von dir aus nacheinander auf: geh gegen die Spirale, zu den Kreisen, die schon eingeschlagen haben.'],
      cible: ['Zielscheibe', 'Drei Ringe um dich schlagen von innen nach außen ein, dann schlägt die Mitte erneut ein: geh direkt nach dem ersten Einschlag raus und dann zurück in die Mitte.'],
      cometes: ['Kometen', 'Drei Kometen durchqueren nacheinander die Arena, jeder angekündigt durch ein breites Band: verlass das Band, sobald es erscheint.'],
      murMarche: ['Wandernde Wand', 'Bänder schlagen von einem Rand zum anderen ein und ihre Lücke verschiebt sich jedes Mal etwas: folge der Lücke.'],
      geyserSuiveur: ['Verfolgende Geysire', 'Alle 0,3 s wird ein Geysir unter deinen Füßen angekündigt, siebenmal: bleib nie stehen und wechsle ab und zu die Richtung.'],
      etoileFilante: ['Sternschnuppe', 'Der Boss durchquert die Arena dreimal geradeaus; jeder Durchgang wird durch eine Linie angekündigt: geh von der Linie weg.'],
      tourbillonBalles: ['Strudel', 'Am Rand bildet sich ein Kugelring, der sich dreht und zum Boss hin zusammenzieht: stell dich vor die Lücke und lass ihn über dich hinweg.'],
      rayonsJumeaux: ['Zwillingsstrahlen', 'Zwei Strahlen zielen auf dich und schwenken dann je zu einer Seite (der helle Bereich zeigt den ganzen Bogen): geh hinter den Boss oder raus aus dem Bogen.'],
      vagueZonesDouble: ['Doppelte Schlagwelle', 'Eine Welle senkrechter Bänder, dann eine waagrechte: finde die Lücke der ersten, dann die der zweiten.'],
      piliersCercle: ['Säulenkreis', 'Acht Kreise leuchten um dich auf und werden zu Feuersäulen: verlass die Kreise und halte einen Weg frei.'],
      pluieCroisee: ['Gekreuzter Sternenregen', 'Zwei Sternenregen im rechten Winkel nacheinander: schlüpf zwischen die Linien des ersten, dann des zweiten.'],
      laserRafale: ['Laserfeuer', 'Fünf Schüsse hintereinander: die Linie folgt dir und erstarrt (weiß). Mach jedes Mal einen Seitenschritt, wenn sie weiß wird.']
    },
    frag: [['Nouveau record !', 'Neuer Rekord!'], ['Premier essai', 'Erster Versuch'], ['Temps restant', 'Verbleibende Zeit'], [' selon tes armes', ' je nach deinen Waffen'], [' · en cours : ', ' · läuft: '], [' (reprendre)', ' (fortsetzen)'], ['1 PV : le moindre coup est fatal', '1 LP: jeder Treffer ist tödlich'], ['Record ', 'Rekord ']]
  }
};
for (const code of Object.keys(T)) {
  const L = LANGS[code]; if (!L) continue;
  const x = T[code];
  L.atk = Object.assign({}, L.atk || {}, T.en.atk, x.atk);
  L.arme = L.arme || { p: {}, s: {}, t: {} };
  for (const k of ['p', 's', 't']) L.arme[k] = Object.assign({}, L.arme[k] || {}, T.en[k], x[k]);
  L.frag = (L.frag || []).concat(x.frag);
}
})();
