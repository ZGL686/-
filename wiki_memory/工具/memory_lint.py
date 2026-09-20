#!/usr/bin/env python3
"""检查并重建工程 Agent 记忆目录的 Markdown 索引。

只使用 Python 标准库。默认工作目录是本文件上两级的记忆根目录。

用法：
    python 工具/memory_lint.py check
    python 工具/memory_lint.py index
    python 工具/memory_lint.py --root <目录> check
"""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable


ALLOWED_TYPES = {"state", "decision", "knowledge", "log", "moc"}
ALLOWED_STATUSES = {"active", "proposed", "deprecated", "superseded", "archived"}
ALLOWED_KINDS = {
    "feature",
    "ui",
    "bug",
    "discussion",
    "test",
    "maintenance",
    "architecture",
    "process",
    "module",
    "operations",
}
REQUIRED_FIELDS = {"type", "status", "kind", "importance", "updated", "topic"}
MANAGED_DIRS = {"当前状态", "决策", "知识", "日志"}
INDEX_PATH = Path("日志") / "MOC_工作日志.md"


@dataclass
class Page:
    path: Path
    fields: dict[str, object] = field(default_factory=dict)
    body: str = ""

    @property
    def rel(self) -> str:
        return self.path.as_posix()

    @property
    def page_type(self) -> str:
        return str(self.fields.get("type", ""))

    @property
    def status(self) -> str:
        return str(self.fields.get("status", ""))

    @property
    def topic(self) -> str:
        return str(self.fields.get("topic", "")).strip()


def is_managed(path: Path) -> bool:
    return bool(path.parts) and path.parts[0] in MANAGED_DIRS


def is_context_source(path: Path) -> bool:
    return is_managed(path) or (len(path.parts) == 1 and path.name in {"README.md", "AGENTS.md", "llm-wiki.md"})


def parse_scalar(raw: str) -> object:
    value = raw.strip()
    if not value:
        return ""
    if value in {"null", "Null", "NULL", "~"}:
        return None
    if value.lower() in {"true", "false"}:
        return value.lower() == "true"
    if (value.startswith("\"") and value.endswith("\"")) or (
        value.startswith("'") and value.endswith("'")
    ):
        return value[1:-1]
    if value.startswith("[") and value.endswith("]"):
        return [str(parse_scalar(item)) for item in value[1:-1].split(",") if item.strip()]
    return value


def parse_frontmatter(text: str) -> tuple[dict[str, object], str, bool]:
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return {}, text, False

    end = next((i for i in range(1, len(lines)) if lines[i].strip() == "---"), None)
    if end is None:
        return {}, text, False

    fields: dict[str, object] = {}
    current_list: str | None = None
    for line in lines[1:end]:
        if re.match(r"^\s*-\s+", line) and current_list:
            item = re.sub(r"^\s*-\s+", "", line)
            existing = fields.setdefault(current_list, [])
            if isinstance(existing, list):
                existing.append(parse_scalar(item))
            continue

        match = re.match(r"^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$", line)
        if not match:
            continue
        key, raw = match.groups()
        if raw.strip() == "":
            fields[key] = []
            current_list = key
        else:
            fields[key] = parse_scalar(raw)
            current_list = None

    body = "\n".join(lines[end + 1 :])
    return fields, body, True


def load_pages(root: Path) -> list[Page]:
    pages: list[Page] = []
    for path in sorted(root.rglob("*.md")):
        rel = path.relative_to(root)
        if is_context_source(rel):
            fields, body, _ = parse_frontmatter(path.read_text(encoding="utf-8"))
            pages.append(Page(rel, fields, body))
    return pages


def links_in(text: str) -> Iterable[str]:
    # 示例代码中的占位链接不是实际引用，不参与断链检查。
    text = re.sub(r"```.*?```", "", text, flags=re.DOTALL)
    text = re.sub(r"`[^`\n]*`", "", text)
    for match in re.finditer(r"\[\[([^\]]+)\]\]", text):
        target = match.group(1).split("|", 1)[0].strip()
        if target and not target.startswith("http") and not target.endswith("/"):
            yield target.split("#", 1)[0].replace("\\", "/")

    for match in re.finditer(r"\[[^\]]*\]\(([^)]+)\)", text):
        target = match.group(1).strip().strip("<>")
        if target and not re.match(r"^(?:https?|mailto):", target) and not target.endswith("/"):
            yield target.split("#", 1)[0].replace("\\", "/")


def resolve_link(source: Path, target: str) -> Path | None:
    if not target:
        return None
    candidate = Path(target)
    if not target.endswith(".md"):
        candidate = candidate.with_suffix(".md")
    if target.startswith("/"):
        return candidate
    if target.startswith(("当前状态/", "决策/", "知识/", "日志/", "模板/")):
        return candidate
    if target.startswith(("./", "../")):
        return source.parent / candidate
    # Obsidian 的裸 wiki 链接按 vault 根目录解析。
    return candidate


def display_title(page: Page) -> str:
    for line in page.body.splitlines():
        if line.startswith("# "):
            return line[2:].strip()
    return page.path.stem


def validate_pages(root: Path, pages: list[Page]) -> list[str]:
    errors: list[str] = []
    page_by_path = {page.rel: page for page in pages}

    for page in pages:
        if is_managed(page.path):
            missing = sorted(REQUIRED_FIELDS - page.fields.keys())
            if missing:
                errors.append(f"{page.rel}: missing frontmatter fields: {', '.join(missing)}")

        if page.page_type and page.page_type not in ALLOWED_TYPES:
            errors.append(f"{page.rel}: invalid type '{page.page_type}'")
        if page.status and page.status not in ALLOWED_STATUSES:
            errors.append(f"{page.rel}: invalid status '{page.status}'")
        kind = str(page.fields.get("kind", ""))
        if kind and kind not in ALLOWED_KINDS:
            errors.append(f"{page.rel}: invalid kind '{kind}'")

        for target in links_in(page.body):
            resolved = resolve_link(page.path, target)
            if resolved is None:
                continue
            normalized = resolved.as_posix().lstrip("./")
            if normalized not in page_by_path and normalized not in {"README.md", "AGENTS.md"}:
                errors.append(f"{page.rel}: broken link '{target}'")

    active_topics: dict[tuple[str, str], list[str]] = {}
    for page in pages:
        if page.status == "active" and page.topic and page.page_type in {"state", "decision"}:
            active_topics.setdefault((page.page_type, page.topic), []).append(page.rel)
    for (page_type, topic), paths in active_topics.items():
        if len(paths) > 1:
            errors.append(f"multiple active {page_type} pages for topic '{topic}': {', '.join(paths)}")

    decision_numbers: dict[str, list[str]] = {}
    for page in pages:
        match = re.match(r"ADR-(\d+)-", page.path.name)
        if match:
            decision_numbers.setdefault(match.group(1), []).append(page.rel)
    for number, paths in decision_numbers.items():
        if len(paths) > 1:
            errors.append(f"duplicate decision number ADR-{number}: {', '.join(paths)}")

    all_text = "\n".join(page.body for page in pages)
    for page in pages:
        if page.page_type == "log" and page.path.name not in {"README.md", "MOC_工作日志.md"}:
            marker = f"日志/{page.path.name}"
            if marker not in all_text:
                errors.append(f"{page.rel}: not referenced by the log MOC or another page")

    incoming: dict[str, int] = {page.rel: 0 for page in pages}
    for page in pages:
        for target in links_in(page.body):
            resolved = resolve_link(page.path, target)
            if resolved is None:
                continue
            normalized = resolved.as_posix().lstrip("./")
            if normalized in incoming and normalized != page.rel:
                incoming[normalized] += 1
    for page in pages:
        if page.page_type in {"state", "decision", "knowledge", "log"} and incoming[page.rel] == 0:
            errors.append(f"orphan page: {page.rel}")

    return errors


def log_pages(pages: list[Page]) -> list[Page]:
    return [page for page in pages if page.page_type == "log" and page.path.parts[0] == "日志"]


def index_logs(root: Path, pages: list[Page]) -> Path:
    logs = sorted(log_pages(pages), key=lambda page: (str(page.fields.get("updated", "")), page.rel), reverse=True)
    lines = [
        "---",
        "type: moc",
        "status: active",
        "kind: process",
        "importance: high",
        f"updated: {max((str(page.fields.get('updated', '')) for page in logs), default='2026-08-21')}",
        "topic: work-log-index",
        "source_logs: []",
        "supersedes: null",
        "---",
        "",
        "# 工作日志 MOC",
        "",
        "> 单一工作日志索引，按更新时间倒序。任务类型通过 `kind` 元数据区分。",
        "",
        "| 时间 | 类型 | 目标 | 状态 | 主题 | 日志 |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    if not logs:
        lines.append("| - | - | 暂无记录 | - | - | - |")
    else:
        for page in logs:
            kind = str(page.fields.get("kind", "-"))
            status = str(page.fields.get("status", "-"))
            topic = page.topic or "-"
            title = display_title(page).replace("|", "\\|")
            goal = "-"
            for line in page.body.splitlines():
                if re.match(r"^[-*] `?目标`?：", line):
                    goal = line.split("：", 1)[1].strip().replace("|", "\\|")
                    break
                if re.match(r"^[-*] (目标|本轮目标)：", line):
                    goal = line.split("：", 1)[1].strip().replace("|", "\\|")
                    break
            link = f"[[日志/{page.path.name}|{title}]]"
            lines.append(f"| {page.fields.get('updated', '-')} | {kind} | {goal} | {status} | {topic} | {link} |")

    lines.extend(
        [
            "",
            "## 使用方式",
            "",
            "- 由 `python 工具/memory_lint.py index` 生成或刷新。",
            "- 查询时先阅读当前状态，再按关键词定位日志。",
            "- 历史日志是审计记录，不应直接覆盖当前状态。",
            "",
            "## 入口",
            "",
        ]
    )
    entry_links = [
        (Path("README.md"), "[[README|工程 Agent 记忆系统]]"),
        (Path("AGENTS.md"), "[[AGENTS|记忆维护协议]]"),
        (Path("日志/README.md"), "[[日志/README|工作日志说明]]"),
        (Path("当前状态/项目概览.md"), "[[当前状态/项目概览|当前项目概览]]"),
        (Path("当前状态/系统架构.md"), "[[当前状态/系统架构|当前系统架构]]"),
    ]
    lines.extend(f"- {label}" for path, label in entry_links if (root / path).exists())
    lines.append("")
    output = root / INDEX_PATH
    output.write_text("\n".join(lines), encoding="utf-8")
    return output


def run_check(root: Path) -> int:
    pages = load_pages(root)
    errors = validate_pages(root, pages)
    if errors:
        print(f"发现 {len(errors)} 个问题：")
        for error in errors:
            print(f"- {error}")
        return 1
    print(f"记忆体检通过：检查 {len(pages)} 个 Markdown 页面。")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=("check", "index"))
    parser.add_argument("--root", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    root = args.root.resolve()
    if not root.is_dir():
        print(f"记忆根目录不存在：{root}", file=sys.stderr)
        return 2

    pages = load_pages(root)
    if args.command == "check":
        return run_check(root)

    output = index_logs(root, pages)
    print(f"已生成日志索引：{output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
