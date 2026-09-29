# Embedded SDK Learning Hub

嵌入式 SDK 互动训练网站：历史 7 组 21 道训练题，点击揭示参考答案、选择题判分、填空题自检、错题本和浏览器本地学习进度。

## 网站部署（首次）

1. GitHub 仓库 Settings → Pages → Build and deployment → Source，选择 GitHub Actions。
2. 打开 Actions → Embedded SDK daily generate and GitHub Pages deploy。上传该工作流时首次 push 会部署历史题库（不需要 API Key）；若尚未启用 Pages 导致首次运行失败，启用后可重新提交一次 site 文件触发部署。
3. Pages 启用后预计网址：https://iamdragonzhang-hash.github.io/embedded-sdk-learning-hub/

## 每日自动更新

在 Settings → Secrets and variables → Actions → New repository secret 创建 OPENAI_API_KEY。此密钥来自 OpenAI API 平台，和 ChatGPT Plus 分开计费，不要提交到代码或聊天。
可选：Actions Variables 设置 OPENAI_MODEL，默认 gpt-5-mini。
工作流 cron 为 UTC 09:00，每天北京时间 17:00 触发，但 GitHub Actions 可能延迟或偶尔错过运行。
添加密钥后从 Actions 手动 Run workflow 验证完整生成、提交、部署。工作流需要 Actions 的仓库 Contents 写权限；如推送失败，检查 Settings → Actions → General → Workflow permissions、分支保护和运行日志。
网站与 ChatGPT 现有定时消息互不依赖；它们不一定生成相同题目。

## 项目

- site/index.html、site/styles.css、site/app.js：静态交互网站。
- site/data/archive.json：可见历史聊天整理的 7 组 21 题；原始发送日期缺失，按批次归档。
- site/data/manifest.json、site/data/days/YYYY-MM-DD.json：每日追加，不覆盖旧题。
- scripts/generate_daily.py：OpenAI API 结构化出题，校验字段与题目种类。
- scripts/validate_data.py：历史题与每日题的基础一致性检查。
- .github/workflows/daily.yml：初始网页部署以及每日生成、提交和部署。
- offline-preview.html：直接双击可查看历史题库的离线预览，不会获取新题。

## 注意

学习记录保存在当前浏览器 localStorage，导出/导入可手工迁移；填空题仅做精确关键词匹配，其他合理答案请展开参考答案自检。AI 题解可能有误，工程结论以手册和实测为准。公开仓库不可加入企业保密代码或日志。

本地预览：在仓库根目录运行 python -m http.server 8000 -d site，打开 http://localhost:8000。
