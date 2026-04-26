export default {
  'pre-commit': 'pnpm lint-staged',
  'pre-push': 'pnpm typecheck && pnpm test',
  'commit-msg': 'pnpm commitlint --edit "$1"',
};
