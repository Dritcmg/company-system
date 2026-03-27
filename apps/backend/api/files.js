// ═══════════════════════════════════════════
//  OPEN TYCOON — Files API (@ mentions)
// ═══════════════════════════════════════════

const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const WORKSPACE = path.join(__dirname, '../../../');
const IGNORE_DIRS = ['node_modules', '.git', 'dist', '.agent', 'data'];
const INCLUDE_EXT = ['.md', '.txt', '.json', '.js', '.ts', '.html', '.css', '.yaml', '.yml', '.toml'];

// GET /api/files/list
router.get('/list', (req, res) => {
  const files = [];
  function walk(dir, prefix = '') {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (IGNORE_DIRS.includes(entry.name)) continue;
        if (entry.name.startsWith('.')) continue;
        const relPath = prefix ? `${prefix}/${entry.name}` : entry.name;
        if (entry.isDirectory()) {
          walk(path.join(dir, entry.name), relPath);
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (INCLUDE_EXT.includes(ext)) {
            const stat = fs.statSync(path.join(dir, entry.name));
            files.push({
              nome: entry.name,
              caminho: relPath,
              tamanho: stat.size,
              extensao: ext,
            });
          }
        }
      }
    } catch (e) { /* skip unreadable dirs */ }
  }
  walk(WORKSPACE);
  res.json({ arquivos: files.slice(0, 100) });
});

// GET /api/files/read?path=...
router.get('/read', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ erro: 'Path obrigatório' });
  
  const fullPath = path.resolve(WORKSPACE, filePath);
  if (!fullPath.startsWith(WORKSPACE)) return res.status(403).json({ erro: 'Acesso negado' });
  
  try {
    const content = fs.readFileSync(fullPath, 'utf-8');
    res.json({ caminho: filePath, conteudo: content.slice(0, 10000) });
  } catch (e) {
    res.status(404).json({ erro: 'Arquivo não encontrado' });
  }
});

module.exports = router;
