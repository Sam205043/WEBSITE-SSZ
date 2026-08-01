/* ==========================================================================
   Soft Skill Zone — Keyboard shortcuts ka bank
   --------------------------------------------------------------------------
   Har entry: [ group, "kaam", "keys" ]

   Trainer isse flashcard banata hai: kaam dikhata hai, student sochta hai,
   fir palat kar keys dekhta hai. Isliye "kaam" wali line saaf aur ek hi
   matlab wali honi chahiye — do tarah se socha ja sake, wo nahi chalega.
   ========================================================================== */

export const SHORTCUT_GROUPS = [
  "Universal", "Windows 11", "MS Word", "MS Excel", "PowerPoint", "Browser & Google"
];

export const SHORTCUTS = [
  /* ---------------- Universal (20) ---------------- */
  ["Universal", "Copy karna", "Ctrl + C"],
  ["Universal", "Cut karna", "Ctrl + X"],
  ["Universal", "Paste karna", "Ctrl + V"],
  ["Universal", "Sirf text paste karna (bina formatting)", "Ctrl + Shift + V"],
  ["Universal", "Undo — pichhla kaam wapas", "Ctrl + Z"],
  ["Universal", "Redo — undo wapas", "Ctrl + Y"],
  ["Universal", "Sab select karna", "Ctrl + A"],
  ["Universal", "Save karna", "Ctrl + S"],
  ["Universal", "Save As", "F12"],
  ["Universal", "Print", "Ctrl + P"],
  ["Universal", "Find (dhundhna)", "Ctrl + F"],
  ["Universal", "Bold", "Ctrl + B"],
  ["Universal", "Italic", "Ctrl + I"],
  ["Universal", "Underline", "Ctrl + U"],
  ["Universal", "Spelling check", "F7"],
  ["Universal", "Naya document / file", "Ctrl + N"],
  ["Universal", "File kholna", "Ctrl + O"],
  ["Universal", "Zoom in", "Ctrl + +"],
  ["Universal", "Zoom out", "Ctrl + -"],
  ["Universal", "Zoom wapas 100%", "Ctrl + 0"],

  /* ---------------- Windows 11 (22) ---------------- */
  ["Windows 11", "File Explorer kholna", "Windows + E"],
  ["Windows 11", "Settings kholna", "Windows + I"],
  ["Windows 11", "Computer lock karna", "Windows + L"],
  ["Windows 11", "Desktop dikhana", "Windows + D"],
  ["Windows 11", "Task View — saari windows", "Windows + Tab"],
  ["Windows 11", "Quick Settings (wifi, sound)", "Windows + A"],
  ["Windows 11", "Projector / doosri screen", "Windows + P"],
  ["Windows 11", "Apps ke beech switch", "Alt + Tab"],
  ["Windows 11", "App band karna", "Alt + F4"],
  ["Windows 11", "Task Manager", "Ctrl + Shift + Esc"],
  ["Windows 11", "Rename karna", "F2"],
  ["Windows 11", "Naya folder", "Ctrl + Shift + N"],
  ["Windows 11", "Screenshot — chuna hua hissa", "Windows + Shift + S"],
  ["Windows 11", "Run box kholna", "Windows + R"],
  ["Windows 11", "Search kholna", "Windows + S"],
  ["Windows 11", "Clipboard history", "Windows + V"],
  ["Windows 11", "Emoji panel", "Windows + ."],
  ["Windows 11", "Khidki aadhi screen par", "Windows + Left/Right arrow"],
  ["Windows 11", "Properties dekhna", "Alt + Enter"],
  ["Windows 11", "Bina Recycle Bin ke delete", "Shift + Delete"],
  ["Windows 11", "Keyboard ki bhasha badalna", "Windows + Spacebar"],
  ["Windows 11", "Notification centre", "Windows + N"],

  /* ---------------- MS Word (18) ---------------- */
  ["MS Word", "Center alignment", "Ctrl + E"],
  ["MS Word", "Left alignment", "Ctrl + L"],
  ["MS Word", "Right alignment", "Ctrl + R"],
  ["MS Word", "Justify alignment", "Ctrl + J"],
  ["MS Word", "Page break — naya page", "Ctrl + Enter"],
  ["MS Word", "Heading 1 lagana", "Ctrl + Alt + 1"],
  ["MS Word", "Case badalna (CAPS / small)", "Shift + F3"],
  ["MS Word", "Find & Replace", "Ctrl + H"],
  ["MS Word", "Track Changes on/off", "Ctrl + Shift + E"],
  ["MS Word", "Comment lagana", "Ctrl + Alt + M"],
  ["MS Word", "Formatting hatana", "Ctrl + Spacebar"],
  ["MS Word", "Tool search box", "Alt + Q"],
  ["MS Word", "Hyperlink lagana", "Ctrl + K"],
  ["MS Word", "Font size bada karna", "Ctrl + ]"],
  ["MS Word", "Font size chhota karna", "Ctrl + ["],
  ["MS Word", "Aaj ki date daalna", "Alt + Shift + D"],
  ["MS Word", "Double line spacing", "Ctrl + 2"],
  ["MS Word", "Word Count dekhna", "Ctrl + Shift + G"],

  /* ---------------- MS Excel (22) ---------------- */
  ["MS Excel", "AutoSum lagana", "Alt + ="],
  ["MS Excel", "Reference par $ ka taala", "F4"],
  ["MS Excel", "Format Cells dialog", "Ctrl + 1"],
  ["MS Excel", "Excel Table banana", "Ctrl + T"],
  ["MS Excel", "Filter arrows on/off", "Ctrl + Shift + L"],
  ["MS Excel", "Aaj ki date (fix)", "Ctrl + ;"],
  ["MS Excel", "Abhi ka samay (fix)", "Ctrl + Shift + ;"],
  ["MS Excel", "Turant chart banana", "Alt + F1"],
  ["MS Excel", "Cell ke andar edit karna", "F2"],
  ["MS Excel", "Formula view on/off", "Ctrl + `"],
  ["MS Excel", "Data ke kinare tak jump", "Ctrl + Arrow"],
  ["MS Excel", "A1 par wapas jaana", "Ctrl + Home"],
  ["MS Excel", "Cell me nayi line", "Alt + Enter"],
  ["MS Excel", "Upar wali cell copy karna", "Ctrl + D"],
  ["MS Excel", "Baayein wali cell copy karna", "Ctrl + R"],
  ["MS Excel", "Paste Special", "Ctrl + Alt + V"],
  ["MS Excel", "Nayi sheet jodna", "Shift + F11"],
  ["MS Excel", "Agli sheet par jaana", "Ctrl + Page Down"],
  ["MS Excel", "Row insert karna", "Ctrl + Shift + +"],
  ["MS Excel", "Row/Column delete karna", "Ctrl + -"],
  ["MS Excel", "Poori column select karna", "Ctrl + Spacebar"],
  ["MS Excel", "Poori row select karna", "Shift + Spacebar"],

  /* ---------------- PowerPoint (12) ---------------- */
  ["PowerPoint", "Nayi slide", "Ctrl + M"],
  ["PowerPoint", "Slide duplicate karna", "Ctrl + D"],
  ["PowerPoint", "Slideshow pehli slide se", "F5"],
  ["PowerPoint", "Slideshow isi slide se", "Shift + F5"],
  ["PowerPoint", "Show me screen kaali", "B"],
  ["PowerPoint", "Show me screen safed", "W"],
  ["PowerPoint", "Show me laser pointer", "Ctrl + L"],
  ["PowerPoint", "Show me pen", "Ctrl + P"],
  ["PowerPoint", "Show me seedha slide 7 par", "7 + Enter"],
  ["PowerPoint", "Slideshow band karna", "Esc"],
  ["PowerPoint", "Cheezon ko group karna", "Ctrl + G"],
  ["PowerPoint", "Presenter View", "Alt + F5"],

  /* ---------------- Browser & Google (16) ---------------- */
  ["Browser & Google", "Naya tab kholna", "Ctrl + T"],
  ["Browser & Google", "Tab band karna", "Ctrl + W"],
  ["Browser & Google", "Band hua tab wapas", "Ctrl + Shift + T"],
  ["Browser & Google", "Bookmark lagana", "Ctrl + D"],
  ["Browser & Google", "History kholna", "Ctrl + H"],
  ["Browser & Google", "Incognito window", "Ctrl + Shift + N"],
  ["Browser & Google", "Page refresh karna", "F5"],
  ["Browser & Google", "Address bar par jaana", "Ctrl + L"],
  ["Browser & Google", "Agle tab par jaana", "Ctrl + Tab"],
  ["Browser & Google", "Gmail: naya email likhna", "C"],
  ["Browser & Google", "Gmail: reply karna", "R"],
  ["Browser & Google", "Gmail: sabko reply", "A"],
  ["Browser & Google", "Gmail: mail bhejna", "Ctrl + Enter"],
  ["Browser & Google", "Docs: comment lagana", "Ctrl + Alt + M"],
  ["Browser & Google", "Meet: mic mute/unmute", "Ctrl + D"],
  ["Browser & Google", "Meet: camera on/off", "Ctrl + E"]
];

export function shortcutsFor(group) {
  return group === "all" ? SHORTCUTS.slice() : SHORTCUTS.filter((s) => s[0] === group);
}

export function shortcutCounts() {
  const out = { all: SHORTCUTS.length };
  SHORTCUT_GROUPS.forEach((g) => { out[g] = SHORTCUTS.filter((s) => s[0] === g).length; });
  return out;
}
