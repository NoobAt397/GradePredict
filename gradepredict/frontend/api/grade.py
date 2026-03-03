import json
import os
import re
from http.server import BaseHTTPRequestHandler

import google.generativeai as genai


def add_cors_headers(response_data, status=200):
    headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
    }
    return headers


class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        for key, value in add_cors_headers({}).items():
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

        assignment_text = data.get("assignment_text", "").strip()
        rubric = data.get("rubric")

        if not assignment_text:
            self._send_json(
                {"success": False, "error": "assignment_text is required"}, 400
            )
            return
        if not rubric or not isinstance(rubric, list) or len(rubric) == 0:
            self._send_json(
                {"success": False, "error": "rubric is required and must be a non-empty list"},
                400,
            )
            return

        api_key = os.environ.get("GOOGLE_API_KEY")
        if not api_key:
            self._send_json(
                {"success": False, "error": "GOOGLE_API_KEY environment variable not set"},
                500,
            )
            return

        rubric_text = "\n".join(
            [
                f"- {c['name']} (max {c['max_score']} points): {c['description']}"
                for c in rubric
            ]
        )

        prompt = f"""You are an expert grader. Grade this assignment based on the rubric below.

RUBRIC:
{rubric_text}

ASSIGNMENT:
{assignment_text}

Respond with ONLY valid JSON — no markdown, no code fences, no explanation outside the JSON.
The JSON must have exactly these fields:
- criteria_scores: array of objects, each with: criterion_name (string), score (number), max_score (number), reasoning (string)
- total_score: number (sum of all scores)
- total_possible: number (sum of all max_scores)
- percentage: number (total_score / total_possible * 100, rounded to one decimal place)
- letter_grade: string — one of "A", "B", "C", "D", or "F"

Letter grade scale: A = 90-100%, B = 80-89%, C = 70-79%, D = 60-69%, F = below 60%."""

        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(
                model_name="gemini-2.5-flash-lite",
                generation_config=genai.types.GenerationConfig(
                    temperature=0.3,
                    response_mime_type="application/json",
                ),
                system_instruction="You are an expert assignment grader. Always respond with valid JSON only.",
            )

            response = model.generate_content(prompt)
            response_text = response.text.strip()

            # Strip markdown code fences if present
            response_text = re.sub(r"^```(?:json)?\s*", "", response_text)
            response_text = re.sub(r"\s*```$", "", response_text)

            grade_result = json.loads(response_text)
            self._send_json({"success": True, "result": grade_result})

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
        for key, value in add_cors_headers(data).items():
            self.send_header(key, value)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        pass
