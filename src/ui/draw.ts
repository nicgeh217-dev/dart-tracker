/** Ob beim nächsten Rendern des Spielscreens die Auslosung „Wer beginnt?“ gezeigt wird. Nur im Speicher, nie gespeichert. */
let armed = false;

export function armDraw(): void {
  armed = true;
}

/** Liefert das Flag einmalig und setzt es zurück. */
export function consumeDraw(): boolean {
  const was = armed;
  armed = false;
  return was;
}
