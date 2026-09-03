import { Fragment, type ReactNode } from 'react'

/**
 * عارضُ ماركداون صغيرٌ لتقرير الذكاء — بلا مكتبة.
 *
 * يكفي ما يكتبه النموذج: عناوين، فقرات، قوائم نقطيّة ومرقّمة، جداول بسيطة،
 * وعريض. وكلُّ ما عدا ذلك يُعرض نصّاً كما هو، فلا يُفقَد شيء.
 */
export function LdMarkdown({ source }: { source: string }) {
  const blocks = parseBlocks(source)

  return (
    <div className="ld-md">
      {blocks.map((block, index) => (
        <Fragment key={index}>{renderBlock(block)}</Fragment>
      ))}
    </div>
  )
}

type Block =
  | { type: 'heading'; level: number; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'table'; header: string[]; rows: string[][] }
  | { type: 'rule' }
  | { type: 'quote'; text: string }

function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let index = 0

  const isTableLine = (line: string) => /^\s*\|.*\|\s*$/.test(line)
  const isSeparator = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line)
  const isBullet = (line: string) => /^\s*([-*•]|[•])\s+/.test(line)
  const isNumbered = (line: string) => /^\s*(\d+|[٠-٩]+)[.)]\s+/.test(line)

  while (index < lines.length) {
    const line = lines[index]

    if (!line.trim()) {
      index += 1
      continue
    }

    const heading = /^\s*(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, text: heading[2].trim() })
      index += 1
      continue
    }

    if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      blocks.push({ type: 'rule' })
      index += 1
      continue
    }

    if (/^\s*>\s?/.test(line)) {
      const quote: string[] = []
      while (index < lines.length && /^\s*>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^\s*>\s?/, ''))
        index += 1
      }
      blocks.push({ type: 'quote', text: quote.join(' ') })
      continue
    }

    if (isTableLine(line)) {
      const tableLines: string[] = []
      while (index < lines.length && isTableLine(lines[index])) {
        tableLines.push(lines[index])
        index += 1
      }
      const cells = (row: string) =>
        row
          .trim()
          .replace(/^\|/, '')
          .replace(/\|$/, '')
          .split('|')
          .map((cell) => cell.trim())
      const body = tableLines.filter((row) => !isSeparator(row))
      if (body.length) {
        blocks.push({ type: 'table', header: cells(body[0]), rows: body.slice(1).map(cells) })
      }
      continue
    }

    if (isBullet(line) || isNumbered(line)) {
      const ordered = isNumbered(line)
      const items: string[] = []
      while (index < lines.length && (ordered ? isNumbered(lines[index]) : isBullet(lines[index]))) {
        items.push(lines[index].replace(ordered ? /^\s*(\d+|[٠-٩]+)[.)]\s+/ : /^\s*([-*•]|[•])\s+/, ''))
        index += 1
      }
      blocks.push({ type: 'list', ordered, items })
      continue
    }

    const paragraph: string[] = [line.trim()]
    index += 1
    while (
      index < lines.length &&
      lines[index].trim() &&
      !/^\s*#{1,6}\s+/.test(lines[index]) &&
      !isBullet(lines[index]) &&
      !isNumbered(lines[index]) &&
      !isTableLine(lines[index]) &&
      !/^\s*>\s?/.test(lines[index])
    ) {
      paragraph.push(lines[index].trim())
      index += 1
    }
    blocks.push({ type: 'paragraph', text: paragraph.join(' ') })
  }

  return blocks
}

function renderBlock(block: Block): ReactNode {
  switch (block.type) {
    case 'heading': {
      const level = Math.min(Math.max(block.level, 1), 3)
      const className = `ld-md__h ld-md__h--${level}`
      if (level === 1) return <h3 className={className}>{inline(block.text)}</h3>
      if (level === 2) return <h4 className={className}>{inline(block.text)}</h4>

      return <h5 className={className}>{inline(block.text)}</h5>
    }
    case 'paragraph':
      return <p className="ld-md__p">{inline(block.text)}</p>
    case 'quote':
      return <blockquote className="ld-md__quote">{inline(block.text)}</blockquote>
    case 'rule':
      return <hr className="ld-md__rule" />
    case 'list':
      return block.ordered ? (
        <ol className="ld-md__list">
          {block.items.map((item, index) => (
            <li key={index}>{inline(item)}</li>
          ))}
        </ol>
      ) : (
        <ul className="ld-md__list">
          {block.items.map((item, index) => (
            <li key={index}>{inline(item)}</li>
          ))}
        </ul>
      )
    case 'table':
      return (
        <div className="ld-md__tablewrap">
          <table className="ld-md__table">
            <thead>
              <tr>
                {block.header.map((cell, index) => (
                  <th key={index}>{inline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{inline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    default:
      return null
  }
}

/** عريض `**x**` وشيفرة `x` فقط — يكفيان لما يكتبه النموذج. */
function inline(text: string): ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean)

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={index}>{part.slice(1, -1)}</code>
    }

    return <Fragment key={index}>{part}</Fragment>
  })
}
