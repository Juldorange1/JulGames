// Vrais sprites (images) — voir art/README.md.
//
// Chaque personnage, tourelle ou boss peut recevoir une image (PNG transparent, vue de dessus,
// face vers la DROITE) qui REMPLACE son dessin actuel. Sans image declaree ici, le dessin
// vectoriel actuel est garde : on peut donc ajouter les sprites un par un.
//
//   char:   { 6: 'art/chars/cendre.png' }          (ids : 1,2,3,5,6,7,8,9,10,11)
//   turret: { T1: 'art/turrets/t1.png' }           (T1 a T12, DUMMY)
//   boss:   { B5: 'art/bosses/colosse.png' }       (B1 a B7)
//
// Taille affichee = diametre du personnage x SPRITE_SCALE (l'image est mise a l'echelle).
const SPRITE_FILES = {
  char: {},
  turret: {},
  boss: {},
};
const SPRITE_SCALE = { char: 2.6, turret: 2.4, boss: 2.5 };

const Sprites = {
  _img: {},
  get(kind, id) {
    const file = SPRITE_FILES[kind] && SPRITE_FILES[kind][id];
    if (!file || typeof Image === 'undefined') return null;
    const key = kind + ':' + id;
    let img = this._img[key];
    if (!img) {
      img = new Image();
      img.onerror = () => { img._bad = true; }; // fichier manquant : on garde le dessin
      img.src = file;
      this._img[key] = img;
    }
    return img.complete && img.naturalWidth && !img._bad ? img : null;
  },
  // Dessine le sprite centre en (0,0) ; renvoie false s'il n'y en a pas (=> dessin vectoriel).
  draw(ctx, kind, id, radius, angle) {
    const img = this.get(kind, id);
    if (!img) return false;
    const size = radius * 2 * (SPRITE_SCALE[kind] || 2.5) / 2;
    const h = size * (img.naturalHeight / img.naturalWidth);
    ctx.save();
    if (angle) ctx.rotate(angle);
    ctx.drawImage(img, -size / 2, -h / 2, size, h);
    ctx.restore();
    return true;
  },
};
