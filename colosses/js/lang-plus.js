'use strict';
/* Colosses — traductions des nouveautés : le Reflet et l'Inverseur, Marathon, parties à graine, saisons, légendes. */
(function () {
const T = {
  en: {
    atk: {
      rf_copie: ['Reflection', 'It copies your weapon: three volleys that look like your own shots. Dodge as if you were shooting at yourself, and hit it meanwhile (×1.6).'],
      rf_symetrie: ['Symmetry', 'Three pairs of circles: one under you, the other at the exact opposite spot of the arena. Do not flee toward your reflection.'],
      rf_eclats: ['Shattered Mirror', 'Two rings of shards that bounce once off the walls: the second is offset, slip half a step between two shards.'],
      iv_renverse: ['Reversal', 'A countdown appears, then your controls are reversed for 5 s. Move in small taps between the slow rings, and strike: it takes ×1.5.'],
      iv_bascule: ['Seesaw', 'One half of the arena strikes, then the other, then the first again: stay near the middle line and cross over right after each strike.'],
      iv_sablier: ['Hourglass', 'Sand falls in columns with one empty column, then flies back up all at once: stand in the empty column and stay there until it is gone.']
    },
    esp: {
      reflet: ['the Reflection', 'It always stays opposite you, like your reflection. Its "Reflection" attack copies your main weapon; while it copies, its mirror is fragile: ×1.6.'],
      inverseur: ['the Inverter', 'It shows a countdown, then your movement controls are reversed for 5 s (up ↔ down, left ↔ right). During the reversal it only fires slow rings and takes ×1.5.']
    },
    phrases: { reflet: ['I am you, but better.', 'Every blow you strike, I return.'], inverseur: ['Your left is my right.', 'Everything you think you know is reversed.'] },
    fmt: { affront: ['Showdown', 'Same weapons for all, one giant colossus: whoever deals it the most damage wins'], chasse: ['Hunt', 'Komm der perfekten Zeit nahe: jede verlorene Sekunde kostet viel, 100 % = exakt die Minimalzeit'], marathon: ['Marathon', 'Every colossus in a row, one life: as fast as possible'], graine: ['Seeded run', 'A fixed run of 6 bosses, the same for everyone with the code: as fast as possible'] },
    titres: { conteur: ['Storyteller', 'Discover 10 legends in the Codex.'] },
    rar: { saison: 'Seasonal' },
    skins: { a_citrouille: 'Pumpkin', c_sorciere: 'Witch\'s Cape', t_chauvesouris: 'Bat Swarm', r_lanterne: 'Haunted Lantern', a_givrefete: 'Festive Frost', c_flocons: 'Snowflake Cape', t_neige: 'Snow', r_boreale: 'Northern Lights', a_sakura: 'Cherry Blossom', c_floraison: 'Blossoming', t_pollen: 'Pollen', r_eclosion: 'Bloom', a_soleilete: 'Summer Sun', c_lagon: 'Lagoon', t_lucioles: 'Fireflies', r_canicule: 'Heatwave' },
    legendes: {
      bourreau: 'Before the Colossi, he was only a jailer with a single axe. Kings fell and prisons emptied, but no one came to tell him the executions were over. He still strikes, out of habit, and counts each head like a prayer.',
      metronome: 'The builders forged it to keep time on the giants\' worksites. When the last builder fell silent, it kept beating, alone, and the whole world ended up dancing to its rhythm. Breaking its beat reminds it that other music exists.',
      sentinelle: 'She guards a door no one remembers ever opening. Her shields have stopped a thousand armies, and only one weariness: her own. They say she still opens for those who know how to wait for the right moment.',
      forgeron: 'He forged the weapons of the first heroes, then those of their enemies, then everyone\'s. One day he understood that no blade outlasts war, and he decided to become war itself. His anvil still rings beneath every arena.',
      hydre: 'Born from the swamp where fallen kings were thrown, she bears one head for each swallowed crown. Her heads argue endlessly, and it is in their quarrels that heroes find an opening.',
      spectre: 'He was a duelist so fast that death itself missed him. Since then he wanders between two heartbeats, neither alive nor fully gone. He only strikes when he becomes real again: for an instant, just long enough to be hit.',
      juge: 'He dispensed justice for a thousand years without ever being wrong, they said, for no one dared to appeal. His scales now weigh the heroes who enter his arena. Those found too light never leave.',
      tisseuse: 'She wove the tapestries that told the history of the world, thread by thread. When history grew too cruel, she began weaving traps instead. Every web she spins is a chapter to cross without getting caught.',
      horloger: 'He built a clock able to count the time left for every thing. When he read his own hour on it, he took the clock apart and made it into armor. Since then, its hands turn for others.',
      serpent: 'He coiled around a mountain to sleep, and the mountain collapsed. He coiled around a city, and the city forgot its name. He is still looking for something strong enough to embrace without breaking.',
      reine: 'Every bee in her swarm carries the memory of a vanished flower. The Queen does not fight for herself, but for a garden only she remembers. As long as one of her children flies, she will not surrender.',
      nebuleuse: 'She was born from the dust of a dead star and keeps the memory of every light that went out. Her volleys are constellations she redraws endlessly. To defeat her, you must learn to read the sky she carries.',
      phenix: 'It died a first time to save a city from eternal winter. It was reborn, and the city had already forgotten it. Since then, each rebirth makes it a little fiercer, and a little less generous.',
      mante: 'She prays before every fight, and no one knows to whom. The monks who followed her say she never forgives the same mistake twice. Those who dodge all her scythes finally see her guard open, like an answer to her prayer.',
      titan: 'The mountains knelt when he first rose. His armor plates are cut from the walls of the kingdoms he crossed. Each broken plate reveals the heart of a vanished fortress.',
      reflet: 'A hero once stared at his reflection in the great mirror of the Colossi for so long that he forgot which of the two was real. The reflection remembered: it stepped out of the mirror and left the hero behind the glass. Since then, it imitates every warrior it meets, searching for the face that will set it free.',
      inverseur: 'He guards the hourglass through which the meaning of things flows: up, down, left and right. When he turns it over, the world flips for an instant, and only patient minds keep their balance. He has never been beaten by strength, only by calm.',
      chimere: 'No one created her: she assembled herself from the pieces the other Colossi left behind. She does not know what she is, so she tries to be everything at once. But even chaos has its habits, and she always repeats her cycle.'
    },
    frag: [
      ['Survie', 'Survival'],
      ['SURVIE', 'SURVIVAL'], ['un boss au hasard · il s\'adapte à tes armes', 'a random boss · it adapts to your weapons'], ["Saison · jusqu'au ", 'Seasonal · until '],
      ['le Reflet', 'the Reflection'], ['l\'Inverseur', 'the Inverter'], ['Commandes inversées dans ', 'Controls reversed in '], ['COMMANDES INVERSÉES', 'CONTROLS REVERSED'],
      ['Il encaisse ×1,5 : frappe !', 'It takes ×1.5: strike!'], ['Commandes normales', 'Controls back to normal'], ['Il copie ton arme !', 'It copies your weapon!'],
      ['MARATHON DES COLOSSES', 'COLOSSI MARATHON'], ['PARTIE À GRAINE — ', 'SEEDED RUN — '], ['Parties à graine', 'Seeded runs'], ['Partie à graine', 'Seeded run'],
      ['Colosses vaincus : ', 'Colossi defeated: '], ['Plus loin : ', 'Furthest: '], [' · meilleur temps : ', ' · best time: '], ['Code : ', 'Code: '],
      ['Donne ce code à un ami : il jouera exactement la même partie.', 'Give this code to a friend: they will play exactly the same run.'],
      ['les # colosses à la suite · 1 vie', 'all # colossi in a row · 1 life'], ['un code = la même partie qu\'un ami', 'one code = the same run as a friend'],
      ['Une graine fixe une partie entière : 6 boss (dont 2 méga boss), toujours les mêmes, avec les mêmes armes et la même difficulté. Donne ton code à un ami : il jouera exactement la même partie, et vous comparerez vos temps. Une graine réussie pour la première fois donne des cristaux.',
       'A seed fixes a whole run: 6 bosses (including 2 mega bosses), always the same, with the same weapons and the same difficulty. Give your code to a friend: they will play exactly the same run, and you can compare your times. Clearing a seed for the first time gives crystals.'],
      ['Jouer un code', 'Play a code'], ['▶ Jouer ce code', '▶ Play this code'], ['Nouvelle graine', 'New seed'], ['🎲 Créer une graine (', '🎲 Create a seed ('],
      ['La difficulté du code est celle que tu as choisie au menu.', 'The code\'s difficulty is the one you chose in the menu.'], ['Tes graines', 'Your seeds'], ['Meilleur temps', 'Best time'], ['Essais', 'Attempts'],
      ['▶ Jouer', '▶ Play'], ['📋 Copier', '📋 Copy'], ['✔ Copié', '✔ Copied'], ['Code non valable : 8 caractères, par exemple G7QF-2MXA.', 'Invalid code: 8 characters, for example G7QF-2MXA.'], ['ex. G7QF-2MXA', 'e.g. G7QF-2MXA'],
      ['Nuit des citrouilles', 'Night of Pumpkins'], ['Fêtes du givre', 'Frost Festival'], ['Éveil des fleurs', 'Blossom Awakening'], ['Feux de l\'été', 'Summer Fires'],
      ['Événement : ', 'Event: '], [' apparences de saison, ', ' seasonal looks, '], [' 💎 chacune (', ' 💎 each ('], [' obtenues). Elles restent à toi pour toujours.', ' obtained). They are yours forever.'],
      ['Pas d\'événement en ce moment', 'No event right now'], ['Prochain : ', 'Next: '], ['. Les apparences de saison ne s\'achètent que pendant leur saison.', '. Seasonal looks can only be bought during their season.'],
      [' : apparences de saison dans la garde-robe', ': seasonal looks in the wardrobe'], ['🛒 Acheter · ', '🛒 Buy · '], ['Revient pendant : ', 'Returns during: '],
      ['📜 Légende', '📜 Legend'], ['Encore # victoires pour la découvrir.', '# more wins to unlock it.'], ['Encore # victoire pour la découvrir.', '# more win to unlock it.'],
      ['janv.', 'Jan.'], ['févr.', 'Feb.'], ['mars', 'Mar.'], ['avr.', 'Apr.'], ['juil.', 'Jul.'], ['août', 'Aug.'], ['oct.', 'Oct.'], ['nov.', 'Nov.'], ['déc.', 'Dec.']
    ]
  },
  es: {
    atk: {
      rf_copie: ['Reflejo', 'Copia tu arma: tres ráfagas que se parecen a tus propios disparos. Esquiva como si te dispararas a ti mismo y golpéalo mientras tanto (×1,6).'],
      rf_symetrie: ['Simetría', 'Tres pares de círculos: uno bajo tus pies y el otro en el punto exactamente opuesto de la arena. No huyas hacia tu reflejo.'],
      rf_eclats: ['Espejo roto', 'Dos anillos de esquirlas que rebotan una vez en los muros: el segundo está desplazado, deslízate medio paso entre dos esquirlas.'],
      iv_renverse: ['Inversión', 'Aparece una cuenta atrás y luego tus controles se invierten 5 s. Muévete a toques cortos entre los anillos lentos y golpea: recibe ×1,5.'],
      iv_bascule: ['Balancín', 'Una mitad de la arena golpea, luego la otra y luego otra vez la primera: quédate cerca de la línea central y cruza justo después de cada golpe.'],
      iv_sablier: ['Reloj de arena', 'La arena cae en columnas con una columna vacía y luego vuelve a subir de golpe: colócate en la columna vacía y quédate hasta que se vaya.']
    },
    esp: {
      reflet: ['el Reflejo', 'Siempre se coloca en el lado opuesto a ti, como tu reflejo. Su ataque «Reflejo» copia tu arma principal; mientras la copia, su espejo es frágil: ×1,6.'],
      inverseur: ['el Inversor', 'Muestra una cuenta atrás y luego tus controles de movimiento se invierten 5 s (arriba ↔ abajo, izquierda ↔ derecha). Durante la inversión solo dispara anillos lentos y recibe ×1,5.']
    },
    phrases: { reflet: ['Soy tú, pero mejor.', 'Cada golpe que das, te lo devuelvo.'], inverseur: ['Tu izquierda es mi derecha.', 'Todo lo que crees saber se invierte.'] },
    fmt: { affront: ['Enfrentamiento', 'Mismas armas para todos, un coloso gigante: gana quien le inflige más daño'], chasse: ['Caza', 'Acércate al tiempo perfecto: 100 % = imposible ir más rápido'], marathon: ['Maratón', 'Todos los colosos seguidos, una sola vida: lo más rápido posible'], graine: ['Partida con semilla', 'Una partida fija de 6 jefes, la misma para todos los que tienen el código: lo más rápido posible'] },
    titres: { conteur: ['Cuentacuentos', 'Descubrir 10 leyendas en el Códice.'] },
    rar: { saison: 'De temporada' },
    skins: { a_citrouille: 'Calabaza', c_sorciere: 'Capa de bruja', t_chauvesouris: 'Enjambre de murciélagos', r_lanterne: 'Farol embrujado', a_givrefete: 'Escarcha festiva', c_flocons: 'Capa de copos', t_neige: 'Nieve', r_boreale: 'Aurora boreal', a_sakura: 'Cerezo', c_floraison: 'Floración', t_pollen: 'Polen', r_eclosion: 'Eclosión', a_soleilete: 'Sol de verano', c_lagon: 'Laguna', t_lucioles: 'Luciérnagas', r_canicule: 'Canícula' },
    legendes: {
      bourreau: 'Antes de los Colosos solo era un carcelero con un hacha. Los reyes cayeron y las prisiones se vaciaron, pero nadie vino a decirle que las ejecuciones habían terminado. Sigue golpeando, por costumbre, y cuenta cada cabeza como una oración.',
      metronome: 'Los constructores lo forjaron para marcar el compás en las obras de los gigantes. Cuando el último constructor calló, siguió latiendo solo, y el mundo entero acabó bailando a su ritmo. Romper su compás es recordarle que existen otras músicas.',
      sentinelle: 'Guarda una puerta que nadie recuerda haber abierto. Sus escudos han detenido mil ejércitos y un solo cansancio: el suyo. Dicen que aún se abre para quienes saben esperar el momento justo.',
      forgeron: 'Forjó las armas de los primeros héroes, luego las de sus enemigos y luego las de todo el mundo. Un día comprendió que ninguna hoja dura más que la guerra, y decidió convertirse en la guerra misma. Su yunque aún resuena bajo cada arena.',
      hydre: 'Nacida del pantano donde arrojaban a los reyes caídos, tiene una cabeza por cada corona engullida. Sus cabezas discuten sin cesar, y es en sus discusiones donde los héroes encuentran un hueco.',
      spectre: 'Fue un duelista tan rápido que la muerte misma falló. Desde entonces vaga entre dos latidos, ni vivo ni del todo ido. Solo golpea cuando vuelve a ser real: un instante, justo lo suficiente para ser alcanzado.',
      juge: 'Impartió justicia durante mil años sin equivocarse nunca, decían, porque nadie se atrevía a apelar. Su balanza pesa ahora a los héroes que entran en su arena. Los que encuentra demasiado ligeros no salen.',
      tisseuse: 'Tejía los tapices que contaban la historia del mundo, hilo a hilo. Cuando la historia se volvió demasiado cruel, empezó a tejer trampas. Cada tela que tiende es un capítulo que hay que cruzar sin quedar atrapado.',
      horloger: 'Construyó un reloj capaz de contar el tiempo que le quedaba a cada cosa. Cuando leyó en él su propia hora, desmontó el reloj y se hizo una armadura con él. Desde entonces, sus agujas giran para los demás.',
      serpent: 'Se enroscó alrededor de una montaña para dormir, y la montaña se derrumbó. Se enroscó alrededor de una ciudad, y la ciudad olvidó su nombre. Todavía busca algo lo bastante sólido para abrazarlo sin romperlo.',
      reine: 'Cada abeja de su enjambre guarda el recuerdo de una flor desaparecida. La Reina no lucha por sí misma, sino por un jardín que solo ella recuerda. Mientras uno de sus hijos vuele, no se rendirá.',
      nebuleuse: 'Nació del polvo de una estrella muerta y guarda la memoria de todas las luces apagadas. Sus ráfagas son constelaciones que redibuja sin fin. Para vencerla hay que saber leer el cielo que lleva.',
      phenix: 'Murió una primera vez para salvar una ciudad del invierno eterno. Renació, y la ciudad ya lo había olvidado. Desde entonces, cada renacimiento lo vuelve un poco más ardiente y un poco menos generoso.',
      mante: 'Reza antes de cada combate, y nadie sabe a quién. Los monjes que la siguieron dicen que nunca perdona dos veces el mismo error. Quienes esquivan todas sus guadañas ven por fin abrirse su guardia, como una respuesta a su oración.',
      titan: 'Las montañas se arrodillaron cuando se levantó por primera vez. Sus placas de armadura están talladas en las murallas de los reinos que atravesó. Cada placa rota deja ver el corazón de una fortaleza desaparecida.',
      reflet: 'Un héroe contempló tanto tiempo su reflejo en el gran espejo de los Colosos que olvidó cuál de los dos era real. El reflejo sí lo recordó: salió del espejo y dejó al héroe tras el cristal. Desde entonces imita a cada guerrero que encuentra, buscando el rostro que lo liberará.',
      inverseur: 'Guarda el reloj de arena por el que fluye el sentido de las cosas: arriba, abajo, izquierda y derecha. Cuando lo gira, el mundo se invierte un instante, y solo las mentes pacientes conservan el equilibrio. Nunca lo ha vencido la fuerza, solo la calma.',
      chimere: 'Nadie la creó: se ensambló sola con los pedazos que los demás Colosos dejaban atrás. No sabe lo que es, así que intenta serlo todo a la vez. Pero hasta el caos tiene sus costumbres, y siempre repite su ciclo.'
    },
    frag: [
      ['Survie', 'Supervivencia'],
      ['SURVIE', 'SUPERVIVENCIA'], ['un boss au hasard · il s\'adapte à tes armes', 'un jefe al azar · se adapta a tus armas'], ["Saison · jusqu'au ", 'Temporada · hasta el '],
      ['le Reflet', 'el Reflejo'], ['l\'Inverseur', 'el Inversor'], ['Commandes inversées dans ', 'Controles invertidos en '], ['COMMANDES INVERSÉES', 'CONTROLES INVERTIDOS'],
      ['Il encaisse ×1,5 : frappe !', 'Recibe ×1,5: ¡golpea!'], ['Commandes normales', 'Controles normales'], ['Il copie ton arme !', '¡Copia tu arma!'],
      ['MARATHON DES COLOSSES', 'MARATÓN DE LOS COLOSOS'], ['PARTIE À GRAINE — ', 'PARTIDA CON SEMILLA — '], ['Parties à graine', 'Partidas con semilla'], ['Partie à graine', 'Partida con semilla'], ['Marathon', 'Maratón'],
      ['Colosses vaincus : ', 'Colosos vencidos: '], ['Plus loin : ', 'Lo más lejos: '], [' · meilleur temps : ', ' · mejor tiempo: '], ['Code : ', 'Código: '],
      ['Donne ce code à un ami : il jouera exactement la même partie.', 'Da este código a un amigo: jugará exactamente la misma partida.'],
      ['les # colosses à la suite · 1 vie', 'los # colosos seguidos · 1 vida'], ['un code = la même partie qu\'un ami', 'un código = la misma partida que un amigo'],
      ['Une graine fixe une partie entière : 6 boss (dont 2 méga boss), toujours les mêmes, avec les mêmes armes et la même difficulté. Donne ton code à un ami : il jouera exactement la même partie, et vous comparerez vos temps. Une graine réussie pour la première fois donne des cristaux.',
       'Una semilla fija una partida entera: 6 jefes (2 de ellos megajefes), siempre los mismos, con las mismas armas y la misma dificultad. Da tu código a un amigo: jugará exactamente la misma partida y compararéis vuestros tiempos. Superar una semilla por primera vez da cristales.'],
      ['Jouer un code', 'Jugar un código'], ['▶ Jouer ce code', '▶ Jugar este código'], ['Nouvelle graine', 'Nueva semilla'], ['🎲 Créer une graine (', '🎲 Crear una semilla ('],
      ['La difficulté du code est celle que tu as choisie au menu.', 'La dificultad del código es la que elegiste en el menú.'], ['Tes graines', 'Tus semillas'], ['Code', 'Código'], ['Meilleur temps', 'Mejor tiempo'], ['Essais', 'Intentos'],
      ['▶ Jouer', '▶ Jugar'], ['📋 Copier', '📋 Copiar'], ['✔ Copié', '✔ Copiado'], ['Code non valable : 8 caractères, par exemple G7QF-2MXA.', 'Código no válido: 8 caracteres, por ejemplo G7QF-2MXA.'], ['ex. G7QF-2MXA', 'p. ej. G7QF-2MXA'],
      ['Nuit des citrouilles', 'Noche de las calabazas'], ['Fêtes du givre', 'Fiestas de la escarcha'], ['Éveil des fleurs', 'Despertar de las flores'], ['Feux de l\'été', 'Fuegos del verano'],
      ['Événement : ', 'Evento: '], [' apparences de saison, ', ' aspectos de temporada, '], [' 💎 chacune (', ' 💎 cada uno ('], [' obtenues). Elles restent à toi pour toujours.', ' obtenidos). Son tuyos para siempre.'],
      ['Pas d\'événement en ce moment', 'Ningún evento por ahora'], ['Prochain : ', 'Próximo: '], ['. Les apparences de saison ne s\'achètent que pendant leur saison.', '. Los aspectos de temporada solo se compran durante su temporada.'],
      [' : apparences de saison dans la garde-robe', ': aspectos de temporada en el vestuario'], ['🛒 Acheter · ', '🛒 Comprar · '], ['Revient pendant : ', 'Vuelve durante: '],
      ['📜 Légende', '📜 Leyenda'], ['Encore # victoires pour la découvrir.', 'Faltan # victorias para descubrirla.'], ['Encore # victoire pour la découvrir.', 'Falta # victoria para descubrirla.'],
      ['janv.', 'ene.'], ['févr.', 'feb.'], ['mars', 'mar.'], ['avr.', 'abr.'], ['juil.', 'jul.'], ['août', 'ago.'], ['oct.', 'oct.'], ['nov.', 'nov.'], ['déc.', 'dic.']
    ]
  },
  de: {
    atk: {
      rf_copie: ['Spiegelung', 'Es kopiert deine Waffe: drei Salven, die wie deine eigenen Schüsse aussehen. Weich aus, als würdest du auf dich selbst schießen, und triff es währenddessen (×1,6).'],
      rf_symetrie: ['Symmetrie', 'Drei Kreispaare: einer unter dir, der andere an der genau gegenüberliegenden Stelle der Arena. Flieh nicht zu deinem Spiegelbild.'],
      rf_eclats: ['Zerbrochener Spiegel', 'Zwei Splitterringe, die einmal an den Wänden abprallen: der zweite ist versetzt, schlüpf einen halben Schritt zwischen zwei Splitter.'],
      iv_renverse: ['Umkehrung', 'Ein Countdown erscheint, dann sind deine Steuerungen 5 s lang umgekehrt. Beweg dich in kleinen Tipps zwischen den langsamen Ringen und schlag zu: er nimmt ×1,5.'],
      iv_bascule: ['Wippe', 'Eine Hälfte der Arena schlägt ein, dann die andere, dann wieder die erste: bleib nahe der Mittellinie und wechsle direkt nach jedem Einschlag die Seite.'],
      iv_sablier: ['Sanduhr', 'Sand fällt in Säulen mit einer leeren Säule und fliegt dann auf einmal zurück nach oben: stell dich in die leere Säule und bleib dort, bis er weg ist.']
    },
    esp: {
      reflet: ['das Spiegelbild', 'Es steht immer dir gegenüber, wie dein Spiegelbild. Sein Angriff „Spiegelung“ kopiert deine Hauptwaffe; während es kopiert, ist sein Spiegel zerbrechlich: ×1,6.'],
      inverseur: ['der Umkehrer', 'Er zeigt einen Countdown, dann sind deine Bewegungstasten 5 s lang umgekehrt (oben ↔ unten, links ↔ rechts). Während der Umkehrung schießt er nur langsame Ringe und nimmt ×1,5.']
    },
    phrases: { reflet: ['Ich bin du, nur besser.', 'Jeden Schlag, den du austeilst, gebe ich zurück.'], inverseur: ['Dein Links ist mein Rechts.', 'Alles, was du zu wissen glaubst, kehrt sich um.'] },
    fmt: { affront: ['Kräftemessen', 'Gleiche Waffen für alle, ein riesiger Koloss: wer ihm den meisten Schaden zufügt, gewinnt'], chasse: ['Jagd', 'Komm der perfekten Zeit nahe: 100 % = schneller geht es nicht'], marathon: ['Marathon', 'Alle Kolosse hintereinander, ein Leben: so schnell wie möglich'], graine: ['Lauf mit Code', 'Ein fester Lauf aus 6 Bossen, gleich für alle mit dem Code: so schnell wie möglich'] },
    titres: { conteur: ['Erzähler', 'Entdecke 10 Legenden im Kodex.'] },
    rar: { saison: 'Saison' },
    skins: { a_citrouille: 'Kürbis', c_sorciere: 'Hexenumhang', t_chauvesouris: 'Fledermausschwarm', r_lanterne: 'Spukende Laterne', a_givrefete: 'Festlicher Frost', c_flocons: 'Schneeflockenumhang', t_neige: 'Schnee', r_boreale: 'Polarlicht', a_sakura: 'Kirschblüte', c_floraison: 'Blütezeit', t_pollen: 'Pollen', r_eclosion: 'Erblühen', a_soleilete: 'Sommersonne', c_lagon: 'Lagune', t_lucioles: 'Glühwürmchen', r_canicule: 'Hitzewelle' },
    legendes: {
      bourreau: 'Vor den Kolossen war er nur ein Kerkermeister mit einer einzigen Axt. Die Könige fielen, die Gefängnisse leerten sich, doch niemand sagte ihm, dass die Hinrichtungen vorbei waren. Er schlägt noch immer zu, aus Gewohnheit, und zählt jeden Kopf wie ein Gebet.',
      metronome: 'Die Baumeister schmiedeten ihn, um auf den Baustellen der Riesen den Takt zu geben. Als der letzte Baumeister verstummte, schlug er allein weiter, und die ganze Welt tanzte schließlich in seinem Rhythmus. Seinen Takt zu brechen erinnert ihn daran, dass es andere Musik gibt.',
      sentinelle: 'Sie bewacht eine Tür, an deren Öffnung sich niemand mehr erinnert. Ihre Schilde haben tausend Heere aufgehalten und nur eine Müdigkeit: ihre eigene. Man sagt, sie öffnet sich noch für jene, die den richtigen Moment abwarten können.',
      forgeron: 'Er schmiedete die Waffen der ersten Helden, dann die ihrer Feinde, dann die aller. Eines Tages begriff er, dass keine Klinge länger hält als der Krieg, und beschloss, selbst der Krieg zu werden. Sein Amboss hallt noch unter jeder Arena.',
      hydre: 'Geboren im Sumpf, in den man gestürzte Könige warf, trägt sie einen Kopf für jede verschlungene Krone. Ihre Köpfe streiten unaufhörlich, und in ihren Streitereien finden Helden eine Lücke.',
      spectre: 'Er war ein so schneller Duellant, dass selbst der Tod ihn verfehlte. Seitdem irrt er zwischen zwei Herzschlägen umher, weder lebendig noch ganz fort. Er schlägt nur zu, wenn er wieder wirklich wird: einen Augenblick, gerade lang genug, um getroffen zu werden.',
      juge: 'Er sprach tausend Jahre lang Recht, ohne sich je zu irren, hieß es, denn niemand wagte Berufung einzulegen. Seine Waage wiegt nun die Helden, die seine Arena betreten. Wer zu leicht befunden wird, kommt nicht heraus.',
      tisseuse: 'Sie webte die Wandteppiche, die die Geschichte der Welt erzählten, Faden um Faden. Als die Geschichte zu grausam wurde, begann sie stattdessen Fallen zu weben. Jedes Netz, das sie spannt, ist ein Kapitel, das man durchqueren muss, ohne sich zu verfangen.',
      horloger: 'Er baute eine Uhr, die die verbleibende Zeit jedes Dings zählen konnte. Als er darauf seine eigene Stunde las, zerlegte er die Uhr und machte sich daraus eine Rüstung. Seitdem drehen sich ihre Zeiger für andere.',
      serpent: 'Er rollte sich um einen Berg, um zu schlafen, und der Berg stürzte ein. Er rollte sich um eine Stadt, und die Stadt vergaß ihren Namen. Er sucht noch immer etwas, das fest genug ist, um es zu umarmen, ohne es zu zerbrechen.',
      reine: 'Jede Biene ihres Schwarms trägt die Erinnerung an eine verschwundene Blume. Die Königin kämpft nicht für sich, sondern für einen Garten, an den nur sie sich erinnert. Solange eines ihrer Kinder fliegt, ergibt sie sich nicht.',
      nebuleuse: 'Sie wurde aus dem Staub eines toten Sterns geboren und bewahrt die Erinnerung an alle erloschenen Lichter. Ihre Salven sind Sternbilder, die sie endlos neu zeichnet. Um sie zu besiegen, muss man den Himmel lesen, den sie trägt.',
      phenix: 'Er starb ein erstes Mal, um eine Stadt vor dem ewigen Winter zu retten. Er wurde wiedergeboren, und die Stadt hatte ihn schon vergessen. Seitdem macht ihn jede Wiedergeburt ein wenig glühender und ein wenig weniger großzügig.',
      mante: 'Sie betet vor jedem Kampf, und niemand weiß, zu wem. Die Mönche, die ihr folgten, sagen, sie vergebe nie zweimal denselben Fehler. Wer allen ihren Sensen ausweicht, sieht endlich ihre Deckung aufgehen, wie eine Antwort auf ihr Gebet.',
      titan: 'Die Berge knieten nieder, als er sich zum ersten Mal erhob. Seine Panzerplatten sind aus den Mauern der Reiche geschnitten, die er durchquerte. Jede zerbrochene Platte zeigt das Herz einer verschwundenen Festung.',
      reflet: 'Ein Held betrachtete sein Spiegelbild im großen Spiegel der Kolosse so lange, dass er vergaß, welches der beiden wirklich war. Das Spiegelbild erinnerte sich: Es trat aus dem Spiegel und ließ den Helden hinter dem Glas zurück. Seitdem ahmt es jeden Krieger nach, dem es begegnet, auf der Suche nach dem Gesicht, das es befreien wird.',
      inverseur: 'Er hütet die Sanduhr, durch die der Sinn der Dinge rinnt: oben, unten, links und rechts. Wenn er sie umdreht, kippt die Welt für einen Augenblick, und nur geduldige Geister behalten das Gleichgewicht. Nie wurde er durch Kraft besiegt, nur durch Ruhe.',
      chimere: 'Niemand hat sie erschaffen: Sie setzte sich selbst aus den Stücken zusammen, die die anderen Kolosse zurückließen. Sie weiß nicht, was sie ist, also versucht sie, alles zugleich zu sein. Doch selbst das Chaos hat seine Gewohnheiten, und sie wiederholt immer ihren Zyklus.'
    },
    frag: [
      ['Survie', 'Überleben'],
      ['SURVIE', 'ÜBERLEBEN'], ['un boss au hasard · il s\'adapte à tes armes', 'ein zufälliger Boss · er passt sich deinen Waffen an'], ["Saison · jusqu'au ", 'Saison · bis '],
      ['le Reflet', 'das Spiegelbild'], ['l\'Inverseur', 'der Umkehrer'], ['Commandes inversées dans ', 'Steuerung umgekehrt in '], ['COMMANDES INVERSÉES', 'STEUERUNG UMGEKEHRT'],
      ['Il encaisse ×1,5 : frappe !', 'Er nimmt ×1,5: schlag zu!'], ['Commandes normales', 'Steuerung wieder normal'], ['Il copie ton arme !', 'Es kopiert deine Waffe!'],
      ['MARATHON DES COLOSSES', 'MARATHON DER KOLOSSE'], ['PARTIE À GRAINE — ', 'LAUF MIT CODE — '], ['Parties à graine', 'Läufe mit Code'], ['Partie à graine', 'Lauf mit Code'],
      ['Colosses vaincus : ', 'Besiegte Kolosse: '], ['Plus loin : ', 'Am weitesten: '], [' · meilleur temps : ', ' · Bestzeit: '], ['Code : ', 'Code: '],
      ['Donne ce code à un ami : il jouera exactement la même partie.', 'Gib diesen Code einem Freund: Er spielt genau denselben Lauf.'],
      ['les # colosses à la suite · 1 vie', 'alle # Kolosse hintereinander · 1 Leben'], ['un code = la même partie qu\'un ami', 'ein Code = derselbe Lauf wie ein Freund'],
      ['Une graine fixe une partie entière : 6 boss (dont 2 méga boss), toujours les mêmes, avec les mêmes armes et la même difficulté. Donne ton code à un ami : il jouera exactement la même partie, et vous comparerez vos temps. Une graine réussie pour la première fois donne des cristaux.',
       'Ein Code legt einen ganzen Lauf fest: 6 Bosse (davon 2 Megabosse), immer dieselben, mit denselben Waffen und derselben Schwierigkeit. Gib deinen Code einem Freund: Er spielt genau denselben Lauf, und ihr vergleicht eure Zeiten. Ein zum ersten Mal geschaffter Code gibt Kristalle.'],
      ['Jouer un code', 'Einen Code spielen'], ['▶ Jouer ce code', '▶ Diesen Code spielen'], ['Nouvelle graine', 'Neuer Code'], ['🎲 Créer une graine (', '🎲 Code erstellen ('],
      ['La difficulté du code est celle que tu as choisie au menu.', 'Die Schwierigkeit des Codes ist die, die du im Menü gewählt hast.'], ['Tes graines', 'Deine Codes'], ['Meilleur temps', 'Bestzeit'], ['Essais', 'Versuche'],
      ['▶ Jouer', '▶ Spielen'], ['📋 Copier', '📋 Kopieren'], ['✔ Copié', '✔ Kopiert'], ['Code non valable : 8 caractères, par exemple G7QF-2MXA.', 'Ungültiger Code: 8 Zeichen, zum Beispiel G7QF-2MXA.'], ['ex. G7QF-2MXA', 'z. B. G7QF-2MXA'],
      ['Nuit des citrouilles', 'Kürbisnacht'], ['Fêtes du givre', 'Frostfest'], ['Éveil des fleurs', 'Blütenerwachen'], ['Feux de l\'été', 'Sommerfeuer'],
      ['Événement : ', 'Event: '], [' apparences de saison, ', ' Saison-Looks, '], [' 💎 chacune (', ' 💎 pro Stück ('], [' obtenues). Elles restent à toi pour toujours.', ' erhalten). Sie gehören dir für immer.'],
      ['Pas d\'événement en ce moment', 'Gerade kein Event'], ['Prochain : ', 'Nächstes: '], ['. Les apparences de saison ne s\'achètent que pendant leur saison.', '. Saison-Looks kann man nur während ihrer Saison kaufen.'],
      [' : apparences de saison dans la garde-robe', ': Saison-Looks in der Garderobe'], ['🛒 Acheter · ', '🛒 Kaufen · '], ['Revient pendant : ', 'Kommt zurück: '],
      ['📜 Légende', '📜 Legende'], ['Encore # victoires pour la découvrir.', 'Noch # Siege, um sie zu entdecken.'], ['Encore # victoire pour la découvrir.', 'Noch # Sieg, um sie zu entdecken.'],
      ['janv.', 'Jan.'], ['févr.', 'Feb.'], ['mars', 'März'], ['avr.', 'Apr.'], ['juil.', 'Juli'], ['août', 'Aug.'], ['oct.', 'Okt.'], ['nov.', 'Nov.'], ['déc.', 'Dez.']
    ]
  }
};
// l'anglais sert de repli pour ce qui manque
for (const code of Object.keys(T)) {
  const L = LANGS[code]; if (!L) continue;
  const x = T[code];
  for (const sec of ['atk', 'esp', 'phrases', 'fmt', 'titres', 'rar', 'skins']) L[sec] = Object.assign({}, L[sec] || {}, T.en[sec], x[sec]);
  L.legendes = Object.assign({}, T.en.legendes, x.legendes);
  // les émojis du début sont souvent remplacés par des icônes : on traduit aussi le texte sans eux
  const sans = x.frag.filter(([fr]) => /^[^\p{L}\d#]+ /u.test(fr)).map(([fr, tr]) => [fr.replace(/^[^\p{L}\d#]+ /u, ''), tr.replace(/^[^\p{L}\d#]+ /u, '')]);
  L.frag = (L.frag || []).concat(x.frag, sans);
}
})();
