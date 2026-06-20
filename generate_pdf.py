import os
import sys
from fpdf import FPDF

# Define Color Palette (RGB)
PRIMARY = (24, 43, 73)      # Dark Navy
SECONDARY = (70, 130, 180)  # Muted Blue
ACCENT = (38, 166, 154)     # Teal
WARNING = (198, 40, 40)     # Crimson
TEXT_DARK = (33, 37, 41)    # Charcoal
BG_LIGHT = (248, 249, 250)  # Light Warm Grey
BORDER = (220, 224, 230)    # Light Grey
WHITE = (255, 255, 255)

class WorkflowPDF(FPDF):
    def header(self):
        if self.page_no() > 1:
            # Header title
            self.set_text_color(*PRIMARY)
            self.set_font("Helvetica", "B", 8)
            self.cell(100, 5, "VOICECARE AI - LEAD PERSONALIZATION AGENT")
            
            # Header subtitle right-aligned
            self.set_text_color(120, 130, 140)
            self.set_font("Helvetica", "I", 8)
            self.cell(0, 5, "Technical Architecture & Workflow Guide", align="R", new_x="LMARGIN", new_y="NEXT")
            
            # Horizontal rule
            self.set_draw_color(*BORDER)
            self.set_line_width(0.3)
            self.line(20, 17, 190, 17)
            self.ln(4)

    def footer(self):
        if self.page_no() > 1:
            # Footer rule
            self.set_draw_color(*BORDER)
            self.set_line_width(0.3)
            self.line(20, 280, 190, 280)
            
            # Footer text
            self.set_y(-15)
            self.set_text_color(120, 130, 140)
            self.set_font("Helvetica", "I", 8)
            self.cell(100, 10, "Confidential - Internal Use Only")
            
            # Page number
            page_text = f"Page {self.page_no()} of {{nb}}"
            self.cell(0, 10, page_text, align="R", new_x="LMARGIN", new_y="NEXT")

    def chapter_title(self, title_text, num_str):
        self.set_text_color(*PRIMARY)
        self.set_font("Helvetica", "B", 14)
        self.cell(0, 8, f"{num_str}. {title_text}", new_x="LMARGIN", new_y="NEXT")
        
        # Sub line under section header
        self.set_draw_color(*SECONDARY)
        self.set_line_width(0.5)
        current_y = self.get_y()
        self.line(20, current_y, 80, current_y)
        self.ln(4)

    def paragraph(self, text, style="", size=10):
        self.set_text_color(*TEXT_DARK)
        self.set_font("Helvetica", style, size)
        self.multi_cell(0, 5, text, new_x="LMARGIN", new_y="NEXT")
        self.ln(2.5)

    def bullet(self, title, desc, bullet_char="-"):
        self.set_text_color(*PRIMARY)
        self.set_font("Helvetica", "B", 10)
        self.cell(6, 5, f" {bullet_char} ")
        self.cell(50, 5, f"{title}:")
        
        self.set_text_color(*TEXT_DARK)
        self.set_font("Helvetica", "", 10)
        self.multi_cell(0, 5, desc, new_x="LMARGIN", new_y="NEXT")
        self.ln(1.5)

def build_pdf():
    pdf = WorkflowPDF(orientation="P", unit="mm", format="A4")
    pdf.set_margins(20, 20, 20)
    pdf.alias_nb_pages()
    
    # ==========================================
    # COVER PAGE
    # ==========================================
    pdf.add_page()
    
    # Geometric Accent Top
    pdf.set_fill_color(*PRIMARY)
    pdf.rect(0, 0, 210, 45, "F")
    
    # White Text on Navy Header
    pdf.set_text_color(*WHITE)
    pdf.set_font("Helvetica", "B", 24)
    pdf.set_y(15)
    pdf.cell(0, 10, "VOICECARE AI", align="C", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", "", 12)
    pdf.cell(0, 6, "Lead Personalization Architecture", align="C", new_x="LMARGIN", new_y="NEXT")
    
    # Title Block
    pdf.set_y(80)
    pdf.set_text_color(*PRIMARY)
    pdf.set_font("Helvetica", "B", 28)
    pdf.multi_cell(0, 12, "Lead Personalization\nSystem & Workflow Guide", align="L", new_x="LMARGIN", new_y="NEXT")
    
    pdf.ln(5)
    pdf.set_text_color(*SECONDARY)
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "Sequential Multi-Agent Pipeline utilizing google-antigravity SDK", new_x="LMARGIN", new_y="NEXT")
    
    # Colored Divider
    pdf.ln(4)
    pdf.set_draw_color(*ACCENT)
    pdf.set_line_width(1.5)
    pdf.line(20, pdf.get_y(), 120, pdf.get_y())
    pdf.ln(12)
    
    # Description
    pdf.set_text_color(*TEXT_DARK)
    pdf.set_font("Helvetica", "", 11)
    desc = (
        "An in-depth guide to the 7-stage sequential AI pipeline engineered to "
        "automate healthcare prospect discovery, relevance scoring, signal-based "
        "research, and compliant outreach drafting without direct LinkedIn automation, "
        "scraping, or clinical data ingestion."
    )
    pdf.multi_cell(0, 6, desc, new_x="LMARGIN", new_y="NEXT")
    
    # Metadata Block at Bottom
    pdf.set_y(220)
    pdf.set_draw_color(*BORDER)
    pdf.set_line_width(0.3)
    pdf.line(20, 220, 190, 220)
    pdf.ln(5)
    
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(45, 5, "Document Scope:")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*TEXT_DARK)
    pdf.cell(0, 5, "Technical Blueprint and Operations Manual", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(45, 5, "Core Engine SDK:")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*TEXT_DARK)
    pdf.cell(0, 5, "Google Antigravity Python SDK & FastAPI", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(45, 5, "Author:")
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*TEXT_DARK)
    pdf.cell(0, 5, "Director of Product & Director of Design", new_x="LMARGIN", new_y="NEXT")
    
    # ==========================================
    # PAGE 2: EXEC SUMMARY & GOALS
    # ==========================================
    pdf.add_page()
    pdf.chapter_title("Executive Summary & Core Objectives", "1")
    
    pdf.paragraph(
        "VoiceCare AI's Go-To-Market (GTM) team requires a reliable, compliant, and cost-effective "
        "solution to surface high-value revenue cycle and patient access leaders. The system must "
        "research prospects using only public information, match recent professional events (signals) "
        "to VoiceCare AI use cases, and draft highly personalized messaging. Crucially, the system "
        "operates on a 'draft-only' paradigm where humans review, edit, and send outreach manually.",
        style=""
    )
    
    pdf.ln(4)
    pdf.paragraph("Core Goals and Fit Criteria:", style="B", size=11)
    pdf.bullet("Daily Pipeline Output", "Surface exactly 5 verified high-value prospects every run (no fillers).")
    pdf.bullet("Verifiable Signals", "Find at least one dated, public signal per prospect (job change, hiring, news).")
    pdf.bullet("VoiceCare Use-Cases", "Map prospect pain hypotheses directly to approved RCM and patient access use-cases.")
    pdf.bullet("Message Drafting", "Generate three ready-to-send outreach formats: connection note, follow-up, and email.")
    pdf.bullet("Zero Automation", "Drafting only. The system never connects, messages, or interacts on behalf of reps.")
    pdf.bullet("Free-Tier Stack", "Uses JINA APIs for search and scraping, and local file storage to operate at zero cost.")
    
    # ==========================================
    # PAGE 3: THE 7-STAGE PIPELINE
    # ==========================================
    pdf.add_page()
    pdf.chapter_title("The 7-Stage Personalization Pipeline", "2")
    
    pdf.paragraph(
        "The system utilizes the Google Antigravity SDK to segment different cognitive tasks "
        "into sequential agent actions, passing validated context downstream.",
        style=""
    )
    
    pdf.ln(2)
    pdf.bullet("Stage 01: Discovery", "Queries s.jina.ai for target roles (RCM Directors, Billing Mgrs) and ingests manual inputs.")
    pdf.bullet("Deduplication", "Checks the name, company, and LinkedIn URL against db.json (lookback default 45 days) and drops duplicates.")
    pdf.bullet("Stage 02: Scoring", "Evaluates fitting criteria out of 100. Selects top 5 and maps backfills.")
    pdf.bullet("Stage 03: Research", "Crawls company websites and news using Jina Reader to build an operational complexity profile.")
    pdf.bullet("Stage 04: Signal", "Extracts the single strongest dated signal. Low confidence scores trigger automated backfills.")
    pdf.bullet("Stage 05: Use-Case", "Maps signal and pain hypothesis to approved VoiceCare AI capabilities.")
    pdf.bullet("Stage 06: Drafting", "Generates connection invite notes, follow-up messages, and emails with no generic AI phrasing.")
    pdf.bullet("Stage 07: Review", "Automated compliance pre-check. Rejects and retries drafts up to 2 times before manual review.")

    # ==========================================
    # PAGE 4: TECHNICAL ARCHITECTURE & DECISIONS
    # ==========================================
    pdf.add_page()
    pdf.chapter_title("Technical Architecture & Decisions", "3")
    
    pdf.paragraph(
        "To satisfy cost and local deployment constraints, we structured the architecture "
        "to run fully in Python with zero third-party cloud database costs.",
        style=""
    )
    
    pdf.ln(2)
    pdf.paragraph("Major Architectural Components:", style="B", size=11)
    
    pdf.bullet("Backend Framework", "FastAPI serves as the asynchronous backend, facilitating easy local running and Vercel routing.")
    pdf.bullet("Agent Framework", "google-antigravity Python SDK drives the model completions, using Pydantic response schemas for deterministic structured output.")
    pdf.bullet("Web Search Layer", "Jina Search (s.jina.ai) and Reader (r.jina.ai) handle public crawling for free without SerpAPI keys.")
    pdf.bullet("Storage Layer", "A local db.json file acts as the database for runs, history logs, and deduplication indexes, avoiding Supabase costs.")
    
    pdf.ln(4)
    pdf.paragraph("System Constraints and Caveats:", style="B", size=11)
    pdf.bullet("Context Lengths", "Jina crawls are capped at 5,000 to 10,000 characters to prevent model token limits and high execution latency.")
    pdf.bullet("Vercel Limits", "Pipeline steps run in parallel. Local execution has unlimited timeouts, while Vercel routes are configured for 60 seconds.")
    pdf.bullet("Idempotency", "Re-running a date overwrites prior pipeline outputs for that date but preserves manual human approval decisions.")

    # ==========================================
    # PAGE 5: COMPLIANCE & SAFETY BOUNDARIES
    # ==========================================
    pdf.add_page()
    pdf.chapter_title("Compliance & Safety Boundaries", "4")
    
    pdf.paragraph(
        "VoiceCare AI operates in the healthcare sector, which demands absolute adherence to privacy "
        "regulations (HIPAA) and platform anti-spam rules. The system implements a strict safety core.",
        style=""
    )
    
    pdf.ln(4)
    pdf.paragraph("Compliance Policies Enforced:", style="B", size=11)
    pdf.bullet("No Scraping", "We do not scrape or automate logged-in LinkedIn pages. Only public search snippets are indexed.")
    pdf.bullet("No Clinical Data", "The pipeline ignores, rejects, and never stores patient-level data or PHI (Protected Health Information).")
    pdf.bullet("Fact Grounding", "Every claim or signal used in an outreach draft must be tied to a traceable source URL in db.json.")
    pdf.bullet("Tone Compliance", "Clichés, fake familiarity, and overpromised ROI outcomes are checked and rejected during Stage 07.")
    pdf.bullet("Manual Control", "A human reviewer must explicitly tick the validation checklist before any draft can be exported or approved.")
    
    pdf.ln(10)
    # Bottom Closing block
    pdf.set_fill_color(*BG_LIGHT)
    pdf.set_draw_color(*BORDER)
    pdf.rect(20, pdf.get_y(), 170, 25, "FD")
    
    pdf.set_y(pdf.get_y() + 3)
    pdf.set_x(25)
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(*PRIMARY)
    pdf.cell(0, 5, "TECHNICAL COMPLIANCE STATEMENT", new_x="LMARGIN", new_y="NEXT")
    
    pdf.set_x(25)
    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(*TEXT_DARK)
    pdf.multi_cell(160, 4, "This agentic architecture is 100% compliant with LinkedIn's terms of service and HIPAA safety boundaries. It acts purely as a local research assistant and drafting tool.")

    # Save to file
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "lead_personalisation_workflow.pdf")
    pdf.output(output_path)
    print(f"📄 PDF generated successfully at: {output_path}")

if __name__ == "__main__":
    build_pdf()
