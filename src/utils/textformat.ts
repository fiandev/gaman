export const TextFormat = {
  // Styles
  RESET: '\x1b[0m',
  BOLD: '\x1b[1m',
  DIM: '\x1b[2m',
  UNDERLINE: '\x1b[4m',
  BLINK: '\x1b[5m',
  REVERSE: '\x1b[7m',
  HIDDEN: '\x1b[8m',
  ITALIC: '\x1b[3m',
  STRIKETHROUGH: '\x1b[9m',

  // Foreground colors
  BLACK: '\x1b[30m',
  BLUE: '\x1b[34m',
  GREEN: '\x1b[32m',
  CYAN: '\x1b[36m',
  RED: '\x1b[31m',
  MAGENTA: '\x1b[35m',
  YELLOW: '\x1b[33m',
  WHITE: '\x1b[37m',
  GRAY: '\x1b[90m',

  LIGHT_BLUE: '\x1b[38;5;117m',
  LIGHT_GREEN: '\x1b[38;5;120m',
  LIGHT_RED: '\x1b[38;5;203m',
  LIGHT_PURPLE: '\x1b[38;5;177m',
  LIGHT_YELLOW: '\x1b[38;5;228m',
  BRIGHT_WHITE: '\x1b[38;5;255m',

  // Background colors
  BG_BLACK: '\x1b[40m',
  BG_BLUE: '\x1b[44m',
  BG_GREEN: '\x1b[42m',
  BG_CYAN: '\x1b[46m',
  BG_RED: '\x1b[41m',
  BG_MAGENTA: '\x1b[45m',
  BG_YELLOW: '\x1b[43m',
  BG_WHITE: '\x1b[47m',
  BG_GRAY: '\x1b[100m',

  BG_LIGHT_BLUE: '\x1b[48;5;117m',
  BG_LIGHT_GREEN: '\x1b[48;5;120m',
  BG_LIGHT_RED: '\x1b[48;5;203m',
  BG_LIGHT_PURPLE: '\x1b[48;5;177m',
  BG_LIGHT_YELLOW: '\x1b[48;5;228m',
  BG_BRIGHT_WHITE: '\x1b[48;5;255m',


};

export function colorize(color: keyof Omit<typeof TextFormat, 'colorize'>, text: string): string {
  const code = TextFormat[color];
  return `${code}${text}${TextFormat.RESET}`;
}