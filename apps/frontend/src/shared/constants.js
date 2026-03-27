// ═══════════════════════════════════════════
//  OPEN TYCOON — Constants (Clean v3)
//  Bright modern palette — no dark PS1 filter
// ═══════════════════════════════════════════

export const API_BASE = 'http://localhost:3000';
export const WS_URL = 'ws://localhost:3000/ws';

// Agent statuses
export const STATUS = {
  IDLE: 'idle',
  WORKING: 'working',
  DONE: 'done',
  ERROR: 'error',
  WALKING: 'walking',
  BREAK: 'break',
};

// Task types
export const TASK_TYPE = {
  READ_FILE: 'read_file',
  WRITE_FILE: 'write_file',
  WEB_SEARCH: 'web_search',
  EXEC: 'exec',
  RESEARCH: 'research',
};

// Task pipeline stages
export const TASK_STAGE = {
  BACKLOG: 'backlog',
  TRIAGEM: 'triagem',
  EXECUCAO: 'em_execucao',
  REVISAO: 'revisao',
  DONE: 'concluida',
};

// ── Color Palette (Clean — bright modern office) ──
export const COLORS = {
  // Scene — clean white background
  BACKGROUND: 0xF0EDE8,
  SKY: 0x87CEEB,
  FOG: 0xF0EDE8,

  // Floor & Walls
  FLOOR_WOOD: 0xA07848,
  FLOOR_WOOD_DARK: 0x7A5830,
  CARPET: 0x8B3030,
  WALL: 0xF0EAE0,
  WALL_TRIM: 0xE0D8C8,
  BASEBOARD: 0xD0C8B8,
  CEILING: 0xFAF8F5,
  WALL_INTERIOR: 0xE8E0D4,

  // Furniture
  DESK_WALNUT: 0x6B4226,
  DESK_SURFACE: 0x7A5230,
  CHAIR_LEATHER: 0x2A2018,
  SHELF_WOOD: 0x6A4828,
  CABINET: 0x4A3020,

  // Agent colors (vibrant)
  MANAGER: 0x1a6830,
  MANAGER_ACCENT: 0x2a8848,
  INTERN: 0xc07700,
  INTERN_ACCENT: 0xd89020,
  CEO_COLOR: 0xA00000,

  // Status indicators (bright, PS1-readable)
  STATUS_IDLE: 0xD4A020,
  STATUS_WORKING: 0x20B858,
  STATUS_DONE: 0x3060E8,
  STATUS_ERROR: 0xE02020,

  // UI Accents
  CRIMSON: 0xA00000,
  GOLD: 0xD4A020,
  WARM_WHITE: 0xF0E8D8,
  CREAM: 0xE0D8C8,

  // Decorations
  PLANT_GREEN: 0x2A7828,
  PLANT_POT: 0x785838,
  BOOK_RED: 0xA02000,
  BOOK_BLUE: 0x203868,
  BOOK_GREEN: 0x285838,
  MUG_WHITE: 0xE8E0D0,
  LAMP_GOLD: 0xC8A048,

  // Kanban
  KANBAN_BOARD: 0xE0D8C8,
  KANBAN_HEADER: 0x303040,
  POSTIT_YELLOW: 0xE8D820,
  POSTIT_PINK: 0xD85888,
  POSTIT_BLUE: 0x58A8D8,
  POSTIT_GREEN: 0x68B870,

  // Meeting room
  MEETING_TABLE: 0x5A3A1E,
  MEETING_BUTTON: 0xCC2020,
};

// Office dimensions
export const OFFICE = {
  FLOOR_SIZE: 24,
  WALL_HEIGHT: 4,
  DESK_WIDTH: 2.4,
  DESK_DEPTH: 1.2,
  DESK_HEIGHT: 0.75,
  GRID_TILE: 1,
  // Room zones (x-ranges)
  CEO_ROOM_X: -12,    // left wall
  CEO_ROOM_W: 8,      // 8 units wide
  DIVIDER_X: -4,      // wall between CEO room and workspace
  MEETING_Z: -7,      // meeting room starts at z=-7
};

// Player movement
export const PLAYER = {
  SPEED: 5,
  RUN_SPEED: 8,
  ROTATION_SPEED: 3,
  CAMERA_HEIGHT: 2.5,
  CAMERA_DISTANCE: 5,
  CAMERA_ANGLE: 0.4,
  INTERACT_DISTANCE: 3.5,
};

// Personalities (PT-BR)
export const PERSONALITIES = {
  meticuloso: { label: 'Meticuloso', emoji: '🔍' },
  veloz: { label: 'Veloz', emoji: '⚡' },
  criativo: { label: 'Criativo', emoji: '🎨' },
  esfomeado: { label: 'Esfomeado', emoji: '🔥' },
  veterano: { label: 'Veterano', emoji: '🎖️' },
};
