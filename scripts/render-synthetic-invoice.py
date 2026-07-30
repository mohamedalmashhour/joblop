#!/usr/bin/env python3
"""Render a deterministic bilingual synthetic invoice sample."""

from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "SYNTHETIC_BILINGUAL_INVOICE_SAMPLE.pdf"


def money(cents: int) -> str:
    return f"${cents / 100:,.2f} CAD"


def main() -> None:
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    title = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=colors.HexColor("#183A37"),
        spaceAfter=7 * mm,
    )
    heading = ParagraphStyle(
        "Heading",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=10,
        leading=13,
        textColor=colors.HexColor("#183A37"),
        spaceAfter=2 * mm,
    )
    body = ParagraphStyle(
        "Body",
        parent=styles["BodyText"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
    )
    warning = ParagraphStyle(
        "Warning",
        parent=body,
        fontName="Helvetica-Bold",
        textColor=colors.HexColor("#8A2D1F"),
        alignment=1,
        borderColor=colors.HexColor("#D8A59C"),
        borderWidth=0.8,
        borderPadding=7,
        backColor=colors.HexColor("#FFF3F0"),
    )

    doc = SimpleDocTemplate(
        str(OUTPUT),
        pagesize=LETTER,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=16 * mm,
        bottomMargin=10 * mm,
        title="Synthetic Bilingual Invoice Sample",
        author="Resident Workforce OS local renderer",
    )
    story = [
        Paragraph("INVOICE / FACTURE", title),
        Paragraph(
            "SYNTHETIC LOCAL SAMPLE - NOT A LEGALLY APPROVED INVOICE<br/>"
            "EXEMPLE LOCAL SYNTHETIQUE - FACTURE NON APPROUVEE JURIDIQUEMENT",
            warning,
        ),
        Spacer(1, 6 * mm),
    ]

    identity = Table(
        [
            [
                Paragraph("<b>Issuer / Emetteur</b>", heading),
                Paragraph("<b>Recipient / Destinataire</b>", heading),
            ],
            [
                Paragraph(
                    "Synthetic Marketplace Issuer<br/>"
                    "Enterprise ID: SYNTHETIC-NEQ-0000000000<br/>"
                    "GST: SYNTHETIC-GST-000000000<br/>"
                    "QST: SYNTHETIC-QST-0000000000",
                    body,
                ),
                Paragraph(
                    "Test Employer Organization A<br/>"
                    "Synthetic recipient reference: ORG-TEST-A<br/>"
                    "Synthetic data only",
                    body,
                ),
            ],
        ],
        colWidths=[84 * mm, 84 * mm],
    )
    identity.setStyle(
        TableStyle(
            [
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("BOX", (0, 0), (-1, -1), 0.6, colors.HexColor("#9DB7B5")),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D4E0DF")),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#EAF2F1")),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    story.extend([identity, Spacer(1, 6 * mm)])

    metadata = Table(
        [
            ["Invoice number / Numero", "SYN-2026-A-000001"],
            ["Issue date / Date d'emission", "2026-07-30"],
            ["Payment terms / Modalites", "Synthetic Net 30 / Net 30 synthetique"],
            ["Source / Source", "Locked synthetic timesheet v3"],
        ],
        colWidths=[67 * mm, 101 * mm],
    )
    metadata.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, -1), "Helvetica", 8.5),
                ("FONT", (0, 0), (0, -1), "Helvetica-Bold", 8.5),
                ("LINEBELOW", (0, 0), (-1, -1), 0.35, colors.HexColor("#D4E0DF")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.extend([metadata, Spacer(1, 7 * mm)])

    rows = [
        ["Description / Description", "Policy / Politique", "Amount / Montant"],
        ["Regular labour / Travail regulier", "regular-v1", money(20_000)],
        ["Urgent labour / Travail urgent", "urgent-v1", money(2_500)],
        ["Approved travel time / Temps de trajet approuve", "travel-v1", money(1_500)],
        ["Approved mileage / Kilometrage approuve", "mileage-v1", money(750)],
        ["Adjustments / Ajustements", "adjust-v1", money(250)],
        ["Marketplace fee / Frais de marche", "fee-v1", money(1_000)],
        ["GST / TPS", "synthetic-qc-tax-v1", money(1_300)],
        ["QST / TVQ", "synthetic-qc-tax-v1", money(2_594)],
        ["Credit / Credit", "credit-v1", f"-{money(500)}"],
    ]
    line_table = Table(rows, colWidths=[92 * mm, 43 * mm, 33 * mm], repeatRows=1)
    line_table.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 8),
                ("FONT", (0, 1), (-1, -1), "Helvetica", 8),
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#183A37")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#C7D6D5")),
                ("ALIGN", (-1, 1), (-1, -1), "RIGHT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.extend([line_table, Spacer(1, 6 * mm)])

    totals = Table(
        [
            ["Subtotal / Sous-total", money(26_000)],
            ["Taxes / Taxes", money(3_894)],
            ["Credits / Credits", f"-{money(500)}"],
            ["TOTAL", money(29_394)],
        ],
        colWidths=[118 * mm, 50 * mm],
        hAlign="RIGHT",
    )
    totals.setStyle(
        TableStyle(
            [
                ("FONT", (0, 0), (-1, -2), "Helvetica", 9),
                ("FONT", (0, -1), (-1, -1), "Helvetica-Bold", 12),
                ("ALIGN", (-1, 0), (-1, -1), "RIGHT"),
                ("LINEABOVE", (0, -1), (-1, -1), 1.2, colors.HexColor("#183A37")),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    story.extend(
        [
            totals,
            Spacer(1, 3 * mm),
            Paragraph(
                "This deterministic sample uses fictional organizations, identifiers, rates and "
                "tax configuration. It does not charge a payment method, prove settlement, file "
                "taxes or send email.<br/><br/>"
                "Cet exemple deterministe utilise des organisations, identifiants, taux et "
                "configurations fiscales fictifs. Il ne debite aucun moyen de paiement, ne prouve "
                "aucun reglement, ne produit aucune declaration fiscale et n'envoie aucun courriel.",
                body,
            ),
        ]
    )
    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    main()
