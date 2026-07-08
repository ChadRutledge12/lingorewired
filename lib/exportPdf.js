'use client'
// Client-side PDF export — runs entirely in the browser, no server round trip.
// Dynamically imported so jsPDF (~200KB) only loads when someone actually
// clicks "Download PDF", not on every page load.

export async function exportDeckPdf(title, cards) {
  const { jsPDF } = await import('jspdf')
  const { autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF()

  doc.setFontSize(16)
  doc.text(title, 14, 18)
  doc.setFontSize(10)
  doc.setTextColor(120)
  doc.text(`${cards.length} word${cards.length === 1 ? '' : 's'} · ${new Date().toLocaleDateString()}`, 14, 25)

  autoTable(doc, {
    startY: 30,
    head: [['Word', 'Part of speech', 'Translation', 'Example (ES / EN)']],
    body: cards.map((c) => [
      c.word || '',
      c.part_of_speech || '',
      c.translation || '',
      [c.example, c.example_translation].filter(Boolean).join('\n'),
    ]),
    styles: { fontSize: 9, cellPadding: 3, valign: 'top' },
    headStyles: { fillColor: [99, 102, 241], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 30, fontStyle: 'bold' },
      1: { cellWidth: 26 },
      2: { cellWidth: 36 },
      3: { cellWidth: 'auto' },
    },
  })

  const filename = `${title.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-+|-+$/g, '') || 'vocabulary'}.pdf`
  doc.save(filename)
}
