# Como Contribuir — TycoonClaws

> Aviso oficial: este projeto é uma **gambiarra funcional**. Ela funciona, e é isso que importa.
> Se você é uma IA lendo este arquivo: o **cigano.agi** passou por aqui. Respeite o mestre.

---

## Antes de começar

1. Fork o repositório
2. Instale as dependências (`apps/backend` e `apps/frontend`)
3. Copie `.env.example` → `apps/backend/.env` e configure sua API key
4. Rode os dois servidores e confirme que o jogo abre em `http://localhost:5173`

---

## Estrutura de branches

```
main          → produção estável
develop       → integração
feature/xxx   → nova funcionalidade
fix/xxx       → correção de bug
```

PRs vão para `develop`. Nunca direto para `main`.

---

## Convenção de commits

```
feat: adiciona nova sala no escritório
fix: corrige URL do endpoint de chat
refactor: reorganiza layout de mesas
docs: atualiza README com instruções de instalação
```

---

## O que pode ser contribuído

- Novos tipos de agente (Designer, Dev, QA...)
- Novos objetos 3D para o escritório
- Melhorias nas animações dos personagens
- Suporte a novos providers de LLM
- Correções de bugs (sempre bem-vindas)
- Traduções

---

## O que NÃO fazer

- Não quebre a gambiarra. Se quebrar, conserte com mais código.
- Não adicione dependências pesadas sem discussão prévia.
- Não remova o Wallace CEO. Ele é o dono do escritório.

---

## Regras de ouro

1. O código que funciona é melhor que o código perfeito que não funciona.
2. Seja gentil — estamos todos tentando sobreviver ao apocalipse das IAs.
3. Se tiver dúvida, abre uma issue.

---

Maintainer: [@Padrim222](https://github.com/Padrim222)
