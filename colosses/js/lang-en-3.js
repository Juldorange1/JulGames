'use strict';
/* Colosses — English translation, part 3: colossi, traits, mutators, modes, arenas, summons, cosmetics, titles,
   regions, entry lines, difficulties, mastery challenges. */
LANG_EN.esp = {
  metronome: ['the Metronome', 'Everything follows its beat (tick + golden ring). Its volleys shift their gaps by half a notch on every beat. After its big volley, its heart opens: ×3 for 2 beats.'],
  sentinelle: ['the Sentinel', 'Its front shield stops all your shots: hit it in the back (×2). If its charge ends in a wall or a pillar, it is stunned and its shield drops.'],
  hydre: ['the Hydra', 'Its body is protected as long as one head lives. The heads spit in turn, clockwise. Cut them all: the body collapses (×1.5) before they grow back.'],
  tisseuse: ['the Weaver', 'It stretches deadly threads between its nodes. Break a node to cut its threads. If all its nodes fall, it gets tangled: stunned and ×2.'],
  spectre: ['the Specter', 'Untouchable, except when it materializes on one of its anchors (3 s). It always visits them in the same order and the next one glows: wait for it there.'],
  forgeron: ['the Smith', 'Each strike heats it up (3 notches). At the 3rd, it overheats: flee the explosion, then it cools down defenseless (×2.5).'],
  reine: ['the Swarm Queen', 'She is protected as long as at least 3 drones live. They come out in formation: area weapons sweep them quickly. Kill the swarm, then strike the Queen.'],
  juge: ['the Judge', 'It shows a sequence of numbered squares, then makes them explode very fast in the same order. Remember the order and rush to a square already passed. After each sentence it kneels (×2).'],
  horloger: ['the Clockmaker', 'Its hands always turn the same way at a fixed speed: turn with them. When they overlap ("noon"), it is open (×2.5).'],
  serpent: ['the Serpent', 'Only its head (×1.4) and the tip of its tail (yellow light, ×3) are vulnerable. Its body stops your shots and burns on contact.'],
  nebuleuse: ['the Nebula', 'It constantly pulls you in. When it inhales (it swells and pulls hard), its heart is bare (×2.5): shoot while running against the pull, then get away before it exhales.'],
  bourreau: ['the Executioner', 'Always the same combo: telegraphed rushes, then a whirlwind (3 hits, 5 in phase 2). After the whirlwind, it catches its breath (×2). Parry is king here.'],
  phenix: ['the Phoenix', 'At the end of its first phase it becomes an egg for 7 s. Break the egg in time: it is reborn weakened and stunned. Otherwise it is reborn with renewed strength.'],
  chimere: ['the Chimera', 'A creature made of pieces of others: its attacks are drawn at random, but it always repeats them in the same order. Watch its cycle.'],
  mante: ['the Mantis', 'It reaps three times in front of it. If none of its three strikes hit you, it stays open: ×2.5 for 2.5 s. Hit: nothing.'],
  titan: ['the Titan', 'Four armor plates protect it (×0.35). Each side you hit wears down its plate; once broken, that side takes ×1.3. Focus on a single side.']
};
LANG_EN.traits = {
  cristaux: ['Crystal-bound', 'Invulnerable while its crystals stand. They come back each phase (and 18 s later).'],
  dos: ['Weak Back', 'It turns towards you: ×2.5 damage in the back, ×0.4 from the front. Go around it.'],
  carapace: ['Carapace', 'An armor absorbs 75% of damage. Special attacks break it 3× faster. It grows back 12 s later.'],
  miroir: ['Reflections', 'When it sparkles white, your shots come back at you. Stop shooting at that moment!'],
  regen: ['Regeneration', 'It slowly heals if it is not hit for 3 s (at most 6% of its health per phase).'],
  souffle: ['Short Breath', 'It only really takes damage between two attacks (golden outline): ×2.2 at that moment, ×0.5 otherwise.'],
  rage: ['Rage', 'The more wounded it is, the faster it chains its attacks.'],
  spectral: ['Spectral', 'From time to time it becomes transparent: your shots pass through it. Use it to reposition.']
};
LANG_EN.mut = {
  verre: ['Glass Body', 'You only have 60 health points.'], frenesie: ['Frenzy', 'Bosses attack 20% faster.'], nuit: ['Pitch Black', 'Every arena is plunged into darkness.'],
  patinoire: ['Ice Rink', 'Every arena is frozen.'], colosses: ['Colossi', 'Bosses are 40% tougher, but your weapons hit 25% harder.'], reflexes: ['Reflexes', 'Talents recharge twice as fast.'],
  jeune: ['Fasting', 'No healing between bosses.'], chaos: ['Chaos', 'Each boss has two extra mutations.'], vitesse: ['Giant Steps', 'You run 25% faster, and so do the bosses.']
};
LANG_EN.fmt = {
  chrono: ['Time Trial', 'Kill the bosses as fast as possible'], survie: ['Survival', 'The boss is invincible and speeds up: hold out as long as possible'],
  unCoup: ['One Hit', '1 HP: kill as many bosses as you can'], danse: ['Dance', 'Without weapons, dodge for 60 s and get hit as little as possible'],
  deluge: ['Deluge', '45 s against an indestructible colossus: deal as much damage as possible'], etau: ['Vise', 'The arena keeps shrinking: kill the bosses as fast as possible'],
  arsenal: ['Crazy Arsenal', 'Your weapons change every 15 s: kill the bosses as fast as possible'], geant: ['Giant', 'A single 4-phase mega boss: as fast as possible'],
  abysses: ['Abyss', 'Endless: each boss is crazier, a single life']
};
LANG_EN.cartes = {
  normale: ['Arena', 'A classic arena.'], cercle: ['Round Arena', 'No corner to hide in.'],
  piliers: ['Pillars', 'Pillars stop all shots, yours and its own. Make bosses charge into them: they get stunned.'],
  lave: ['Lava', 'Lava pools burn if you walk in them.'], glace: ['Ice', 'The ground is slippery: you take time to brake and change direction.'],
  tenebres: ['Darkness', 'You can only see well close to you. Telegraphed zones stay visible.'], etau: ['Vise', 'The walls slowly close in.'], vent: ['Storm', 'A violent wind pushes you, and it changes direction.']
};
LANG_EN.invoc = {
  larve: ['Larvae', 'Small creatures that rush at you.'], tireur: ['Shooters', 'They stay at range and fire bursts.'], kamikaze: ['Kamikazes', 'They rush at you and explode after a short signal.'],
  tourelle: ['Turrets', 'Stationary, they spit bullets while spinning.'], cristal: ['Crystals', 'They protect their master.'], tete: ['Hydra Heads', 'They protect the Hydra\'s body and spit in turn.'],
  noeud: ['Web Nodes', 'The Weaver\'s threads run between them.'], totem: ['Totems', 'Stationary: while a totem stands, the boss takes 45% less damage (a glowing link shows it).'],
  poseur: ['Mine Layers', 'They wander the arena and drop mines that arm, then explode when you pass close.']
};
LANG_EN.skins = {
  a_acier: 'Steel', a_bronze: 'Bronze', a_jade: 'Jade', a_obsidienne: 'Obsidian', a_sang: 'Blood', a_givre: 'Frost', a_or: 'Gold', a_neant: 'Void', a_soleil: 'Black Sun',
  c_pourpre: 'Crimson', c_nuit: 'Night', c_foret: 'Forest', c_braise: 'Ember', c_azur: 'Starry Azure', c_royale: 'Royal', c_aurore: 'Aurora', c_dragon: 'Dragon Wings',
  v_cyan: 'Cyan', v_rouge: 'Red', v_vert: 'Emerald', v_or: 'Golden', v_violet: 'Amethyst', v_blanc: 'Pure Light',
  t_aucune: 'None', t_poussiere: 'Dust', t_braises: 'Embers', t_givre: 'Frost', t_ombre: 'Shadow', t_etoiles: 'Stardust',
  r_aucune: 'None', r_cyan: 'Glow', r_feu: 'Flames', r_couronne: 'Crown',
  a_rouille: 'Rust', a_os: 'Bone', a_ardoise: 'Slate', a_corail: 'Coral', a_saphir: 'Sapphire', a_cendre: 'Ash', a_emeraude: 'Royal Emerald', a_aube: 'Dawn',
  c_sable: 'Sand', c_cendree: 'Ashen', c_venin: 'Venom', c_givree: 'Frosted', c_sangroyal: 'Royal Blood', c_nebuleuse: 'Nebula', c_phenix: 'Phoenix Feathers',
  v_ambre: 'Amber', v_rose: 'Pink', v_glace: 'Ice', v_toxique: 'Toxic', v_sang: 'Blood', v_soleil: 'Sun',
  t_feuilles: 'Leaves', t_cendres: 'Ashes', t_sang: 'Blood', t_foudre: 'Lightning', t_petales: 'Petals', t_aurore: 'Aurora',
  r_brume: 'Mist', r_givre: 'Frost', r_venin: 'Venom', r_sang: 'Blood', r_divine: 'Divine',
  a_eclipse: 'Eclipse', a_obsidienne_doree: 'Golden Obsidian', c_voile: 'Celestial Veil', c_brasier: 'Eternal Blaze', v_prisme: 'Prism', t_comete: 'Comet', r_astral: 'Astral'
};
LANG_EN.titres = {
  novice: ['Novice', 'The starting title.'], chasseur: ['Hunter', 'Defeat 10 bosses.'], tueur: ['Colossus Slayer', 'Defeat 100 bosses.'], legende: ['Living Legend', 'Defeat 500 bosses.'],
  intouchable: ['Untouchable', 'Defeat a boss without being hit.'], fantome: ['Ghost', '25 victories without being hit.'], eclair: ['Lightning', 'Defeat a boss in under 45 seconds.'],
  inarretable: ['Unstoppable', 'Defeat 15 bosses in a row without dying.'], megas: ['Giant Breaker', 'Defeat 10 mega bosses.'],
  marais: ['Marsh Walker', 'Reach region III, the Drowned Marsh.'], pelerin: ['Sky Pilgrim', 'Reach region VI, the Celestial Ruins.'],
  eternel: ['Eternal', 'Go through all 6 regions and come back to the Temple (room 31).'], regicide: ['Regicide', 'Defeat a Sovereign of the Colossi (room 30).'],
  cauchemar: ['Child of Nightmare', 'Reach room 11 in Nightmare.'], erudit: ['Scholar', 'Meet every boss species.'],
  grandmaitre: ['Grandmaster', 'Get all 4 stars on every species.'], dieu: ['Peerless', 'Complete all 5 mastery challenges on every species.']
};
LANG_EN.regions = [
  ['Forgotten Temple', 'Trapped Tiles', 'Tiles light up, then collapse: leave the glowing square.'],
  ['Forge of the Titans', 'Steam Jets', 'The wall grates spit scalding steam: step out of the marked strip.'],
  ['Drowned Marsh', 'Gas Bubbles', 'The mud slows your steps, and gas bubbles burst under your feet: do not stand still.'],
  ['Heart of the Volcano', 'Eruptions', 'The ground cracks and spews lava: three circles, one of them under you.'],
  ['Sunken Cathedral', 'Stained-Glass Light', 'A beam of light crosses the arena from the stained glass: get out of its line.'],
  ['Celestial Ruins', 'Gusts', 'A gust, announced by white streaks, pushes you: walk against the wind.']
];
LANG_EN.phrases = {
  bourreau: ['Your head will roll like the others.', 'The axe never misses twice.'], metronome: ['One, two… and you fall on three.', 'Time beats on. You will not, for long.'],
  sentinelle: ['None shall pass the gate I guard.', 'My eyes never close.'], forgeron: ['I will forge a blade from your bones.', 'The fire of my forge is hungry.'],
  hydre: ['Cut off one head, there is always another to bite you.', 'We are many. You are alone.'], spectre: ['You cannot kill what is already dead.', 'I am the shadow behind your shoulder.'],
  juge: ['The sentence has already been passed.', 'Guilty. Before you even came in.'], tisseuse: ['Every step tangles you deeper in my web.', 'Come… the web is soft.'],
  horloger: ['Your seconds belong to me.', 'Tick. Tock. The end.'], serpent: ['I will hold you until your last breath.', 'The ground trembles when I slither.'],
  reine: ['My children are hungry.', 'Kneel before the hive.'], nebuleuse: ['I was born from a dead star.', 'The stars went out for me.'],
  phenix: ['I am always reborn. You are not.', 'Burn with me.'], mante: ['I pray before I strike.', 'A single gesture is enough.'],
  titan: ['The mountains knelt.', 'I am the weight of the world.'], chimere: ['Three beasts, one hunger.', 'I am all your nightmares at once.']
};
LANG_EN.phases = ['Awakening', 'Wrath', 'Madness', 'Fury', 'Eclipse', 'Apotheosis', 'Agony', 'Last Breath'];
LANG_EN.rar = { commun: 'Common', rare: 'Rare', epique: 'Epic', mythique: 'Mythic', legendaire: 'Legendary' };
LANG_EN.slots = { armure: 'Armor', cape: 'Cape', visiere: 'Visor', trainee: 'Trail', aura: 'Aura' };
LANG_EN.fam = { fusil: 'Guns', lame: 'Blades', trait: 'Throwers', explosif: 'Explosives', magie: 'Magic' };
LANG_EN.diffs = { apprenti: ['Apprentice', 'To learn the bosses without suffering too much.'], guerrier: ['Warrior', 'The real fight: fast, dense, merciless.'], cauchemar: ['Nightmare', 'Three or four hits and it is over. For those who know the bosses by heart.'] };
LANG_EN.defisM = [['Defeated', 'Defeat it once'], ['Fast', 'Defeat it in under 1:30'], ['Clean', 'Defeat it taking 3 hits or fewer'], ['Nightmare', 'Defeat it in Nightmare difficulty'], ['Perfect', 'Defeat it without being hit even once']];
LANG_EN.souverains = 'Sovereign of the Colossi';
LANG_EN.pieges = { dalles: 'Trapped Tiles', vapeur: 'Steam Jets', vase: 'Gas Bubbles', eruption: 'Eruptions', vitrail: 'Stained-Glass Light', bourrasque: 'Gusts' };
