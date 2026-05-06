# GitBook 托管说明

## 仓库配置

本仓库已经加入 GitBook Git Sync 需要的根目录配置：

- `.gitbook.yaml`：声明文档根目录和入口文件。
- `README.md`：GitBook 首页。
- `SUMMARY.md`：GitBook 侧边栏目录。
- `docs/product-architecture.md`：产品架构设计正文。

当前配置如下：

```yaml
root: ./

structure:
  readme: README.md
  summary: SUMMARY.md
```

## GitBook 空间绑定

在 GitBook 中创建或打开目标 space，然后执行：

1. 打开 space 右上角的 Configure。
2. 选择 GitHub Sync。
3. 授权 GitBook GitHub App 访问仓库。
4. 选择仓库 `Asahi-D08/superzhuochongkingprojectv1` 和分支 `main`。
5. 初次同步方向选择 GitHub -> GitBook。
6. 同步完成后发布 GitBook 站点。

完成绑定后，推送到 `main` 的 Markdown 文档会同步到 GitBook；在 GitBook 编辑器中合并的变更也会作为提交同步回仓库。

## 维护规则

- 目录结构以 `SUMMARY.md` 为准，新增公开文档后同步更新该文件。
- Git Sync 开启后，`README.md` 应优先在 Git 仓库中维护，避免和 GitBook 编辑器产生冲突。
- 不要在 GitBook 文档中写入 AstrBot API Key、后台密码、个人 token 或本地绝对路径。
- 产品方案放在 `docs/`，执行计划和历史记录可以继续放在 `docs/plans/` 或 `docs/superpowers/`。

## 参考链接

- [GitBook GitHub & GitLab Sync](https://gitbook.com/docs/getting-started/git-sync)
- [GitBook Content configuration](https://gitbook.com/docs/getting-started/git-sync/content-configuration)
- [GitBook Enabling GitHub Sync](https://gitbook.com/docs/getting-started/git-sync/enabling-github-sync)
