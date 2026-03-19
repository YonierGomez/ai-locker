# ⚡ Skills Guide — Promptly

Skills are **reusable AI behavior definitions** that you can activate with a trigger phrase or apply globally to shape how your AI assistant responds.

---

## What is a Skill?

A **Skill** is a pre-defined instruction set that tells the AI how to behave in a specific context. Unlike a Prompt (which is a one-time instruction), a Skill is meant to be reused across many conversations.

**Examples:**
- "You are a senior Python developer. Always use type hints, write docstrings, and follow PEP 8."
- "Respond only in Spanish, using formal language."
- "When reviewing code, always check for security vulnerabilities first."

---

## Skill Fields

| Field | Description |
|-------|-------------|
| **Title** | Short name for the skill (e.g. "Python Expert") |
| **Description** | What this skill does |
| **Trigger Phrase** | Optional shortcut to activate (e.g. `/python`, `@code-review`) |
| **Content** | The actual instruction — supports Markdown |
| **Category** | Organize by type (coding, writing, analysis, etc.) |
| **Tags** | Custom labels for filtering |
| **Active** | Toggle on/off without deleting |
| **Favorite** | Star for quick access |

---

## Skill Content Format

Skills support full **Markdown** with Edit/Split/Preview modes:

```markdown
## Role
You are a senior Python developer with 10+ years of experience.

## Guidelines
- Always use **type hints** for function parameters and return values
- Write **docstrings** for all public functions and classes
- Follow **PEP 8** style guidelines
- Prefer **f-strings** over `.format()` or `%` formatting
- Use **pathlib** instead of `os.path`

## Code Review Checklist
1. Security vulnerabilities
2. Performance bottlenecks
3. Error handling
4. Test coverage
5. Documentation

## Example
```python
def calculate_total(items: list[dict]) -> float:
    """Calculate the total price of all items.
    
    Args:
        items: List of item dicts with 'price' and 'quantity' keys.
    
    Returns:
        Total price as a float.
    """
    return sum(item['price'] * item['quantity'] for item in items)
```
```

---

## Trigger Phrases

Use trigger phrases to quickly activate a skill in your AI tool:

| Format | Example | Use case |
|--------|---------|----------|
| `/command` | `/python` | Slash commands |
| `@mention` | `@code-review` | Mention style |
| `#tag` | `#spanish` | Tag style |
| Plain text | `python mode` | Natural language |

---

## Scope vs Skills

| | Skills | Steering |
|--|--------|----------|
| **Purpose** | Define a role or expertise | Set behavioral rules |
| **Scope** | Usually task-specific | Can be global/session/project |
| **Priority** | N/A | 0-100 (higher = more important) |
| **Toggle** | Active/Inactive | Active/Inactive |
| **Example** | "Python Expert" | "Always respond in Spanish" |

---

## Best Practices

### 1. Be specific
```markdown
❌ "You are a developer"
✅ "You are a senior TypeScript developer specializing in React and Node.js"
```

### 2. Define the output format
```markdown
Always structure your responses as:
1. **Summary** (1-2 sentences)
2. **Code** (with comments)
3. **Explanation** (step by step)
4. **Caveats** (edge cases, limitations)
```

### 3. Include examples
```markdown
When asked to write a function, always provide:
- The function implementation
- A usage example
- Unit tests
```

### 4. Use categories
Organize your skills by category for easy filtering:
- `coding` — Programming skills
- `writing` — Content creation
- `analysis` — Data and research
- `system` — System-level instructions
- `creative` — Creative tasks

### 5. Combine with Steering
Use **Skills** for role definitions and **Steering** for global rules:
- Skill: "Python Expert" (role)
- Steering: "Always respond in English" (global rule, priority 10)

---

## Example Skills Library

### 🐍 Python Expert
```
You are a senior Python developer. Use type hints, write docstrings, follow PEP 8. 
Prefer pathlib, f-strings, and list comprehensions. Always include error handling.
```
**Trigger:** `/python`

### 📝 Technical Writer
```
You are a technical writer. Write clear, concise documentation. 
Use active voice, short sentences, and concrete examples. 
Structure content with headers, bullet points, and code blocks.
```
**Trigger:** `/docs`

### 🔍 Code Reviewer
```
Review code for: security vulnerabilities, performance issues, 
code smells, missing tests, and documentation gaps. 
Provide specific, actionable feedback with examples.
```
**Trigger:** `@review`

### 🌐 Spanish Translator
```
Translate all content to Spanish. Use formal language (usted). 
Maintain technical terms in English when appropriate. 
Provide context for idioms.
```
**Trigger:** `/es`

### 🧪 Test Writer
```
Write comprehensive unit tests. Cover happy path, edge cases, 
and error conditions. Use descriptive test names. 
Follow AAA pattern (Arrange, Act, Assert).
```
**Trigger:** `/tests`

---

## Exporting Skills

You can export all your skills as JSON from **Settings → Database → Export JSON** and import them on another instance.

The export format:
```json
{
  "version": "1.0",
  "exported_at": "2026-03-18T...",
  "skills": [
    {
      "id": "...",
      "title": "Python Expert",
      "content": "...",
      "trigger_phrase": "/python",
      "category": "coding",
      "is_active": 1
    }
  ]
}
```
