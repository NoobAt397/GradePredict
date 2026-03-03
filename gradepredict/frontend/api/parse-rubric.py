import base64
import json
import os
import re
from http.server import BaseHTTPRequestHandler

import google.generativeai as genai

CORS_HEADERS = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

PROMPT = (
    "This is a grading rubric PDF. Extract ALL grading criteria from it. "
    "For each criterion, identify: the criterion name, the maximum points/marks "
    "allocated to it, and a brief description of what is being evaluated. "
    "Distribute marks intelligently — if the rubric shows a total but individual "
    "breakdowns are unclear, infer a logical distribution. "
    'Return ONLY valid JSON: { "criteria": [ { "name": "...", "max_score": 0, "description": "..." } ] }'
)


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)
        self.end_headers()

    def do_POST(self):
        try:
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            data = json.loads(body)
        except (json.JSONDecodeError, ValueError):
            self._send_json({"success": False, "error": "Invalid JSON body"}, 400)
            return

        pdf_base64 = data.get("pdf_base64", "").strip()
        if not pdf_base64:
            self._send_json({"success": False, "error": "pdf_base64 is required"}, 400)
            return

        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            self._send_json(
                {"success": False, "error": "GOOGLE_API_KEY environment variable not set"},
                500,
            )
            return

        try:
            pdf_bytes = base64.b64decode(pdf_base64)
        except Exception:
            self._send_json({"success": False, "error": "Invalid base64 encoding"}, 400)
            return

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash-lite",
                generation_config=genai.types.GenerationConfig(
                    temperature=0.2,
                    response_mime_type="application/json",
                ),
                system_instruction="You are an expert at reading academic grading rubrics. Always respond with valid JSON only.",
            )

            response = model.generate_content([
                PROMPT,
                {
                    "mime_type": "application/pdf",
                    "data": pdf_bytes,
                },
            ])

            response_text = response.text.strip()

            # Strip markdown code fences if present
            response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
            response_text = re.sub(r"\s*```$", "", response_text)

            parsed = json.loads(response_text)
            criteria = parsed.get("criteria", parsed)
            self._send_json({"success": True, "criteria": criteria})

        except json.JSONDecodeError as e:
            self._send_json(
                {"success": False, "error": f"Failed to parse AI response: {str(e)}"},
                500,
            )
        except Exception as e:
            self._send_json({"success": False, "error": str(e)}, 500)

    def _send_json(self, data, status=200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        for key, value in CORS_HEADERS.items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass
