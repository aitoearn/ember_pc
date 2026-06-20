<div align="center"><a name="readme-top"></a>

<img src="./docs/images/readme-hero-en.png" alt="Ember README hero banner: Test once, quality in sight" width="100%" />

# Ember

### Test once, quality in sight

**Open-source AI test workspace for QA teams**

Desktop test design, regression planning, API/E2E validation, knowledge context, multi-model analysis, and device automation workflows.

[简体中文](./README.md) · **English** · [Docs](./docs/README.md) · [Release Notes](./RELEASE_NOTES.en.md) · [Issues](https://github.com/embercloud/ember/issues)

<p>
  <a href="https://github.com/embercloud/ember/releases"><img src="https://img.shields.io/github/v/release/embercloud/ember?label=release" alt="Ember GitHub Release" /></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-246B45" alt="Ember supports macOS and Windows" />
  <img src="https://img.shields.io/badge/desktop-Electron-24C8DB" alt="Ember is an Electron desktop app" />
  <img src="https://img.shields.io/badge/license-GPLv3-2F4F4F" alt="Ember GPLv3 license" />
</p>

Ember keeps requirements, test context, cases, execution notes, and regression review in one place, so quality work becomes a workflow you can continue instead of a one-off chat.

<sub>The Simplified Chinese README is the primary version. This English page is a companion for international readers.</sub>

</div>

---

<details>
<summary><kbd>Table of Contents</kbd></summary>

- [What is Ember?](#what-is-ember)
- [What you can do with Ember](#what-you-can-do-with-ember)
- [Real QA workflows](#real-qa-workflows)
- [A simple workflow](#a-simple-workflow)
- [Core Workflow](#core-workflow)
- [Who Ember is for](#who-ember-is-for)
- [If you are searching for these tools](#if-you-are-searching-for-these-tools)
- [Who Ember is not for](#who-ember-is-not-for)
- [Quick Start](#quick-start)
- [Tech Stack and Platforms](#tech-stack-and-platforms)
- [FAQ](#faq)
- [License](#license)
- [Disclaimer](#disclaimer)

</details>

---

## What is Ember?

Ember is an open-source Electron desktop AI workspace for QA engineers, SDETs, release managers, and small quality teams. It brings test design, regression planning, API validation, E2E planning, performance and security testing, test context management, and multi-model workflows into one local desktop product.

Think of Ember as an AI workspace for long-running quality work:

- Not just one prompt and one answer, but a project or release that can keep moving forward.
- Not repeatedly collecting PRDs, API docs, and old cases, but saving test context and repeatable methods.
- Not leaving conclusions scattered across chat history, but keeping useful cases and checklists for the next round.
- Not locking you into one AI service, but letting you use the providers and models you already configure.

If you often switch between requirements docs, API platforms, bug trackers, automation scripts, and model dashboards, Ember is designed to bring those steps back into one test space.

---

## What you can do with Ember

- **Test design and analysis**: organize functional cases, API cases, edge scenarios, and assertion checklists.
- **Regression and release validation**: scope regression coverage, priorities, and release gate suggestions by version.
- **Specialized testing plans**: compatibility matrices, E2E main paths, performance load tests, and security review outlines.
- **Test context management**: store PRDs, API docs, test standards, environment info, and historical defects.
- **Experts and Skills**: use built-in testing experts and Skills for strategy, design, automation, performance, and security.
- **Agent Apps and device automation**: organize batch execution through the Test Workbench app; combine with device automation for mobile validation.

---

## Real QA workflows

### 1. Before release: large change set, unclear regression scope

A release touches login, order, and payment flows. You know regression is needed, but it is hard to decide what must be fully covered versus sampled.

With Ember, you can put release notes, core paths, and known risks into one task, let AI draft regression scope and priorities, then keep refining: which scenarios must run in full? which need environment prep?

What remains is not just one answer, but a test trail from scope to execution checklist.

### 2. API testing: docs exist, cases and assertions do not

OpenAPI or contract docs are ready, but happy paths, auth failures, boundary values, and error responses are not yet structured.

In Ember, you can feed contracts and focus scenarios into a task, generate extendable API cases and assertion points, and persist them into the current project's test context.

### 3. Multi-platform work: compatibility matrices are hard to maintain

The same feature must be validated on web, mobile, and multiple OS versions. Manual matrix maintenance is costly and easy to miss.

Ember fits this kind of specialized work: structure coverage and risk priority first, then add cases step by step and keep iterating in the workspace.

### 4. Defect review: many issues, little structured analysis

A release accumulates defects and the team needs module distribution, recurrence risk, and root-cause patterns, but lacks time for systematic review.

With Ember, you can import defect summaries or test records, classify and analyze them, then turn the output into the next testing strategy and observation metrics.

### 5. Small teams: testing know-how lives in individuals

Some people are strong at API testing, others at E2E or performance. The problem is that this experience rarely becomes reusable team entry points.

Ember can turn stable testing practices into Skills, experts, and app entries so the next regression plan or API review does not start from a blank prompt.

---

## A simple workflow

1. Create a task, such as "Scope regression for v2.3 release candidate"
2. Add PRD summaries, API notes, known defects, or environment constraints
3. Choose your AI provider and model
4. Let Ember draft scope, scenarios, or case structure first
5. Keep refining assertions, E2E steps, or specialized test plans in the same task
6. Save useful outputs into project knowledge for the next validation round

In short: bring test context in first, let AI help you move forward, then keep what is useful.

---

## Core Workflow

### Start from one test task

<img src="./docs/images/readme-feature-start.png" alt="Ember start from one test task" />

Start from a testing goal and keep references, models, Skills, and recent outputs in one place without facing a wall of tools first.

### Keep refining in one test space

<img src="./docs/images/readme-feature-workspace.png" alt="Ember keep refining in one workspace" />

Generation, follow-up questions, edits, reference lookup, and result organization all stay around the current task. Good for cases, regression lists, reports, and specialized plans that need multiple rounds.

### Use your own AI services

<img src="./docs/images/readme-feature-provider.png" alt="Ember use your own AI providers" />

Ember does not provide model services itself. Configure your own providers, API keys, and preferred models for different testing tasks.

---

## Who Ember is for

- QA engineers, SDETs, quality leads, and release managers
- Teams maintaining regression lists, API cases, E2E plans, or specialized test documents
- People who regularly organize PRDs, API docs, defects, and test reports
- Teams that want to save personal methods, team templates, and project context
- People already using AI models who want a more stable testing workspace

---

## If you are searching for these tools

Ember may fit searches like: AI test workspace, desktop QA tool, test case design, regression planning, API testing assistant, knowledge base for testing, multi-model workflow, E2E testing, performance testing, security testing, mobile automation.

---

## Who Ember is not for

- People who only want a quick web chat and do not want project or test context management
- People who refuse to configure any AI provider or API key
- People expecting a tool that automatically runs all tests and owns quality outcomes

Ember works best when AI is a testing collaborator: you provide scope, context, and judgment; it helps organize, generate, analyze, and review.

---

## Quick Start

### Download

Get the installer from [Releases](https://github.com/embercloud/ember/releases).

- macOS: `.dmg` or Homebrew
- Windows: `Ember_*_x64-setup.exe`
- macOS and Windows only; Linux desktop builds are paused
- Windows SmartScreen warnings may appear for unsigned or low-reputation installers

Homebrew on macOS:

```bash
brew tap aiclientproxy/tap
brew install --cask ember
```

### First run

1. Open Ember
2. Go to AI provider settings
3. Add your API key and test the connection
4. Return to home and create a test task
5. Add a PRD, API note, or testing goal and start generating cases or regression lists

---

## Tech Stack and Platforms

- Desktop: Electron, Rust App Server
- Frontend: React, TypeScript, Vite
- Platforms: macOS, Windows
- License: GPLv3

---

## FAQ

### Does Ember provide AI models?

No. Ember is a testing workspace, not a model provider. Configure your own AI provider and API key.

### Will all my test data be uploaded?

Ember prefers to keep project knowledge, session history, and settings on your machine. When you call AI generation, relevant input is sent to your configured provider. Handle sensitive data according to provider policy.

### How is this different from a normal chat tool?

Chat tools optimize for one-shot Q&A. Ember optimizes for long-running quality work: context can be saved, cases and checklists can accumulate, tasks can continue, and repeatable methods can be reused.

### Do I need to be good at prompt engineering?

No. Ember is designed to reduce starting from blank prompts every time. Begin from built-in testing Skills, expert entries, project knowledge, and prior outputs, then iterate step by step.

---

## License

[GNU General Public License v3 (GPLv3)](https://www.gnu.org/licenses/gpl-3.0)

## Disclaimer

This project is for learning and research. Users assume their own risk.
Ember does not provide AI model services; model capabilities come from third-party providers.

---

<div align="center">



</div>
