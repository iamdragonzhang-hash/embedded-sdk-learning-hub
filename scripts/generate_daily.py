#!/usr/bin/env python3
"""Daily embedded SDK quiz generator. OPENAI_API_KEY must be a secret."""
import json
import os
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "site" / "data"
FIELDS = {
    "topic": {"type": "string"},
    "title": {"type": "string"},
    "type": {"type": "string", "enum": ["knowledge", "review", "choice", "fill"]},
    "difficulty": {"type": "string", "enum": ["中级", "工程进阶", "高阶"]},
    "question": {"type": "string"},
    "code": {"type": "string"},
    "options": {"type": "array", "items": {"type": "string"}},
    "correct_index": {"type": "integer"},
    "accepted_answers": {"type": "array", "items": {"type": "string"}},
    "answer": {"type": "string"},
    "explanation": {"type": "string"},
    "diagnostic_cue": {"type": "string"},
}
QUESTION = {"type": "object", "properties": FIELDS, "required": list(FIELDS), "additionalProperties": False}
SCHEMA = {"type": "object", "properties": {"intro": {"type": "string"},
          "questions": {"type": "array", "items": QUESTION}},
          "required": ["intro", "questions"], "additionalProperties": False}


def validate(questions):
    if not isinstance(questions, list) or not 1 <= len(questions) <= 3:
        raise ValueError("Expected 1-3 questions")
    titles = set()
    for q in questions:
        if not isinstance(q, dict) or set(q) != set(FIELDS):
            raise ValueError("Wrong question fields")
        if not all(isinstance(q[f], str) and q[f].strip() for f in
                   ("topic", "title", "question", "answer", "explanation", "diagnostic_cue")):
            raise ValueError("Missing non-empty text")
        if q["title"] in titles:
            raise ValueError("Duplicate daily title")
        titles.add(q["title"])
        if q["type"] not in ("knowledge", "review", "choice", "fill"):
            raise ValueError("Invalid type")
        if q["difficulty"] not in ("中级", "工程进阶", "高阶"):
            raise ValueError("Invalid difficulty")
        if not isinstance(q["code"], str):
            raise ValueError("Invalid code")
        if not isinstance(q["options"], list) or not all(isinstance(x, str) for x in q["options"]):
            raise ValueError("Invalid options")
        if not isinstance(q["correct_index"], int):
            raise ValueError("Invalid index")
        if not isinstance(q["accepted_answers"], list) or not all(isinstance(x, str) for x in q["accepted_answers"]):
            raise ValueError("Invalid accepted answers")
        if q["type"] == "choice":
            if not 2 <= len(q["options"]) <= 5 or not 0 <= q["correct_index"] < len(q["options"]) or q["accepted_answers"]:
                raise ValueError("Bad choice question")
        elif q["options"] or q["correct_index"] != -1:
            raise ValueError("Bad non-choice question")
        if q["type"] == "fill" and not q["accepted_answers"]:
            raise ValueError("Fill answer missing")
        if q["type"] != "fill" and q["accepted_answers"]:
            raise ValueError("Unexpected fill answers")


def main():
    day = datetime.now(ZoneInfo("Asia/Shanghai")).strftime("%Y-%m-%d")
    dest = DATA / "days" / (day + ".json")
    index = DATA / "manifest.json"
    manifest = json.loads(index.read_text(encoding="utf-8"))
    if dest.exists():
        manifest["days"] = sorted(set(manifest["days"] + [day]), reverse=True)
        index.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print("Already published:", day)
        return
    if not os.getenv("OPENAI_API_KEY"):
        raise RuntimeError("Configure OPENAI_API_KEY in GitHub Actions repository secrets")
    from openai import OpenAI
    archive = json.loads((DATA / "archive.json").read_text(encoding="utf-8"))
    titles = [q["title"] for b in archive["batches"] for q in b["questions"]]
    for d in manifest["days"][:30]:
        p = DATA / "days" / (d + ".json")
        if p.exists():
            titles.extend(q["title"] for q in json.loads(p.read_text(encoding="utf-8"))["questions"])
    system = (
        "你是嵌入式音频DSP SDK资深工程师。每天出1-3道工程实践训练题，中文，偏软件，偶尔涵盖硬件。"
        "至少一道开放式知识问答，可穿插Code Review找bug、选择题和填空题，避免机械背诵。"
        "轮换Cache/DMA、内存、ELF/链接、中断、SPI/I2C/UART/SDIO/I2S/ASRC、寄存器、"
        "FreeRTOS/Zephyr/RT-Thread、GPIO、晶振/PLL和底层C等主题。问题中不能直接泄露答案。"
        "答案解释必须准确、自包含、可验证；芯片特定差异请明确依平台/芯片手册而定，不能编造行为。"
        "knowledge/review: options=[]、correct_index=-1、accepted_answers=[]；"
        "choice: 2到5选项唯一正确、correct_index从0开始、accepted_answers=[]；"
        "fill: options=[]、correct_index=-1，accepted_answers是可精确匹配的等价术语或数字。"
        "diagnostic_cue写下次什么现象应优先想到这项知识。"
    )
    result = OpenAI(timeout=140.0, max_retries=2).responses.create(
        model=os.getenv("OPENAI_MODEL", "gpt-5-mini"),
        input=[{"role": "system", "content": system},
               {"role": "user", "content": "北京时间" + day + "，避免重复历史题：" +
                json.dumps(titles[-90:], ensure_ascii=False)}],
        text={"format": {"type": "json_schema", "name": "daily_sdk", "strict": True, "schema": SCHEMA}},
    )
    if not result.output_text:
        raise ValueError("Empty response")
    pack = json.loads(result.output_text)
    validate(pack["questions"])
    if not isinstance(pack["intro"], str) or not pack["intro"].strip():
        raise ValueError("Invalid introduction")
    for i, q in enumerate(pack["questions"], 1):
        q["id"] = day + "-q" + str(i)
    dest.parent.mkdir(exist_ok=True, parents=True)
    tmp = dest.with_suffix(".tmp")
    tmp.write_text(json.dumps({"date": day, "intro": pack["intro"], "questions": pack["questions"]},
                              ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(dest)
    manifest["days"] = sorted(set(manifest["days"] + [day]), reverse=True)
    index.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Published", len(pack["questions"]), "questions:", day)


if __name__ == "__main__":
    main()
