# Embedded SDK Learning Hub

嵌入式 SDK 互动训练网站：历史 7 组 21 道训练题，点击揭示参考答案、选择题判分、填空题自检、错题本和浏览器本地学习进度。

## 网站部署（首次）

1. GitHub 仓库 Settings → Pages → Build and deployment → Source，选择 GitHub Actions。
2. 打开 Actions → Embedded SDK daily generate and GitHub Pages deploy。上传该工作流时首次 push 会部署历史题库（不需要 API Key）；若尚未启用 Pages 导致首次运行失败，启用后可重新提交一次 site 文件触发部署。
3. Pages 启用后预计网址：https://iamdragonzhang-hash.github.io/embedded-sdk-learning-hub/

## 每日自动更新

每日题目不再由 GitHub Actions 调用 OpenAI API。现在由 ChatGPT 的“嵌入式每日训练”定时任务在北京时间 17:00 生成 1～3 道题，并通过已连接的 GitHub 插件写入：

- `site/data/days/YYYY-MM-DD.json`
- `site/data/manifest.json`

提交到 `main` 后，GitHub Actions 只负责校验静态站点并部署 GitHub Pages，不会调用 OpenAI API，也不依赖 `OPENAI_API_KEY`。

如果当天文件已经存在，定时任务应复用当天题目，不重复生成或覆盖历史。网站和 ChatGPT 消息使用同一份当天 JSON 作为最终落盘记录。


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
