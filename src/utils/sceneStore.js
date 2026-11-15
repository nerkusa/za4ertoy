/* Флаги сцены, которые ставит мастер: топь, бездорожье, на ходу.
   App подставляет их из мира через setScene(); cF читает getScene(). */
let _scene = {};
export function setScene(s) { _scene = (s && typeof s === 'object') ? s : {}; }
export function getScene() { return _scene; }
