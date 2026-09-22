---
name: create-pr
description: |
  현재 브랜치의 변경사항을 분석해 GitHub PR을 생성한다.
  "PR 생성해줘", "PR 만들어줘", "pull request 만들어줘", "PR 올려줘", "create a PR", "open a PR", "/create-pr" 같은 요청에 활성화한다.
  기본은 한국어 PR 템플릿을 사용하고, 영어 기반 오픈소스 프로젝트로 판단되면 영어 템플릿을 사용한다.
  브랜치 push와 PR 생성까지 직접 수행한다(요청 자체가 승인이므로 별도 확인 없이 진행하되, 커밋되지 않은 변경사항이 있으면 먼저 사용자에게 알린다).
context: fork
---

# create-pr: GitHub PR 생성

현재 브랜치와 base 브랜치(main/master) 간의 차이를 분석해 PR 제목·본문을 작성하고, `gh pr create`로 GitHub PR을 생성한다.

## 워크플로우

### Step 0: 저장소 지침 확인

저장소 루트에 `AGENTS.md` 또는 `CLAUDE.md`가 있으면 읽는다. PR 템플릿, 언어, 라벨, 리뷰어 지정 등에 대한 규칙이 명시돼 있으면 그것을 이 스킬의 기본 로직보다 우선한다.

### Step 1: 사전 점검

- `git status`로 커밋되지 않은 변경사항이 있는지 확인한다. 있다면 PR에 포함할지 사용자에게 먼저 확인한다(임의로 커밋하지 않는다 — 커밋은 `commit` 스킬의 역할이다).
- `gh auth status`로 GitHub CLI 인증 여부를 확인한다. 인증돼 있지 않으면 사용자에게 안내하고 중단한다.
- 현재 브랜치가 base 브랜치(main/master 등 저장소의 기본 브랜치)와 같으면, PR을 만들 수 없으므로 사용자에게 알리고 중단한다.

### Step 2: 브랜치를 원격과 동기화

- `git rev-parse --abbrev-ref --symbolic-full-name @{u}` 등으로 현재 브랜치에 upstream이 설정돼 있는지 확인한다.
- upstream이 없거나 로컬이 원격보다 앞서 있으면 `git push -u origin <현재 브랜치>`로 push한다. PR 생성 요청 자체가 push에 대한 승인이므로 별도로 다시 묻지 않는다.

### Step 3: 변경 이력 분석

- base 브랜치를 확인한다: `gh repo view --json defaultBranchRef -q .defaultBranchRef.name` 또는 `git symbolic-ref refs/remotes/origin/HEAD`.
- `git log <base>..HEAD --oneline`과 `git diff <base>...HEAD`로 이번 PR에 포함될 커밋과 변경 내용을 파악한다.
- 이미 같은 브랜치로 열린 PR이 있는지 `gh pr list --head <현재 브랜치> --state open`으로 확인한다. 있으면 새로 만들지 말고 기존 PR 링크를 사용자에게 보여준다.

### Step 4: PR 템플릿 선택

기본값은 **한국어 템플릿**(`references/pr_template_ko.md`)이다.

다음 신호를 이 순서로 확인해 **영어 기반 오픈소스 프로젝트**로 판단되면 **영어 템플릿**(`references/pr_template_en.md`)을 사용한다:

1. `gh pr list --state all --limit 5`로 기존 PR 제목·본문 언어를 확인한다. 대부분 영어면 영어 템플릿을 쓴다.
2. 위에서 판단이 안 되면 README.md, CONTRIBUTING.md의 언어를 확인한다. 한글이 거의 없고 영어로만 작성돼 있으며, LICENSE 파일이 있는 등 오픈소스 관례를 따르는 저장소면 영어 템플릿을 쓴다.
3. 그래도 애매하면 한국어 템플릿(기본값)을 유지한다.

Step 0에서 확인한 저장소 지침에 언어 규칙이 명시돼 있다면 이 판별 로직보다 그것을 우선한다.

### Step 5: PR 제목·본문 작성

- 제목은 70자 이내로, 저장소의 커밋 컨벤션(있다면)을 따른다.
- 선택한 템플릿 파일을 읽어 그 구조를 그대로 채운다. 섹션을 임의로 생략하거나 새로 만들지 않는다.
- 본문 내용은 Step 3에서 파악한 실제 커밋·diff에 근거해 작성한다. 커밋에 없는 내용을 지어내지 않는다.

### Step 6: PR 생성

- `gh pr create --title "..." --body "..."`로 PR을 생성한다. 본문은 HEREDOC으로 전달해 포맷을 보존한다.
- base 브랜치를 명시적으로 지정한다(`--base <base>`).
- 생성 후 PR URL을 사용자에게 보고한다.

### Step 7: 결과 보고

- 생성된 PR URL, 사용한 템플릿 언어, base/head 브랜치를 요약해 보고한다.
- 이미 열린 PR이 있어서 새로 만들지 않은 경우, 그 사실과 기존 PR URL을 보고한다.
