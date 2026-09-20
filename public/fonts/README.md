# Noto Sans SC

来源：[Google Fonts 官方仓库](https://github.com/google/fonts/tree/main/ofl/notosanssc)。下载日期：2026-09-20。

- 原文件：`NotoSansSC[wght].ttf`，17,772,300 字节。
- 交付：`NotoSansSC.woff2`，7,782,636 字节，使用 fontTools 转换容器格式。保留全部 30,890 个 Unicode 映射、100–900 可变字重；未按学生名单裁剪字体。
- CSS 家族别名：`GuiLu Sans`。字体内部名称仍为 Noto Sans SC。
- 许可：SIL Open Font License 1.1，完整文本见 `OFL.txt`。打包时复制为 `FONT-LICENSE.txt`。
- 只从应用自身加载，不请求 Google Fonts CDN；极少数字体未收录的字会回退系统中文字体。

重建：从上述官方仓库取得原字体，使用 `fontTools.ttLib.TTFont` 加载，设置 `font.flavor = 'woff2'` 后保存，需要 brotli。转换不改变字形内容。
