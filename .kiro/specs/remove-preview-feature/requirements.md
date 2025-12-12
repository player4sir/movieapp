# Requirements Document

## Introduction

本功能旨在移除当前付费墙系统中存在安全漏洞的试看（Preview）功能，简化前端播放控制逻辑。当前试看功能完全依赖前端时间追踪，用户可以通过刷新页面、修改状态等方式轻易绕过限制。移除试看功能后，系统将采用更简洁的访问控制模式：用户要么有完整访问权限（VIP/SVIP/已购买），要么需要付费解锁才能观看。

## Glossary

- **Paywall**: 付费墙系统，控制用户对付费内容的访问权限
- **Preview/试看**: 允许用户在付费前观看部分内容的功能（将被移除）
- **AccessType**: 访问类型，包括 'free'（免费）、'vip'（会员）、'purchased'（已购买）、'locked'（需付费）
- **SourceCategory**: 内容分类，包括 'normal'（普通内容）和 'adult'（成人内容）
- **UnlockPromptModal**: 解锁提示弹窗，显示价格和解锁选项

## Requirements

### Requirement 1

**User Story:** As a developer, I want to remove the preview time tracking logic from the play page, so that the codebase is simpler and more maintainable.

#### Acceptance Criteria

1. WHEN the play page loads for content without access THEN the System SHALL display the unlock prompt modal immediately without starting video playback
2. WHEN the user has full access (free/vip/purchased) THEN the System SHALL allow unrestricted video playback
3. WHEN the preview-related state variables are removed THEN the System SHALL maintain all other playback functionality unchanged

### Requirement 2

**User Story:** As a developer, I want to simplify the AccessType enum by removing the 'preview' type, so that the access control logic is clearer.

#### Acceptance Criteria

1. WHEN checking content access THEN the System SHALL return 'locked' instead of 'preview' for users without access
2. WHEN the AccessType is 'locked' THEN the System SHALL include the unlock price in the response
3. WHEN the AccessType changes from 'preview' to 'locked' THEN the System SHALL update all dependent components accordingly

### Requirement 3

**User Story:** As a user without access, I want to see a clear unlock prompt when trying to play paid content, so that I understand I need to pay to watch.

#### Acceptance Criteria

1. WHEN a user without access attempts to play content THEN the System SHALL display the UnlockPromptModal with price and balance information
2. WHEN the unlock modal is displayed THEN the System SHALL show the video poster image as background instead of playing video
3. WHEN the user closes the unlock modal THEN the System SHALL navigate back or show content details without playing video

### Requirement 4

**User Story:** As a developer, I want to remove preview-related configuration and API responses, so that the backend is consistent with the simplified frontend.

#### Acceptance Criteria

1. WHEN the paywall service checks access THEN the System SHALL omit previewDuration from the response
2. WHEN the content access API returns a locked status THEN the System SHALL include only hasAccess, accessType, and price fields
3. WHEN the preview duration configuration is deprecated THEN the System SHALL document this change for future reference

### Requirement 5

**User Story:** As a user with VIP/SVIP membership, I want my access to remain unchanged after the preview removal, so that my viewing experience is not affected.

#### Acceptance Criteria

1. WHEN a VIP user accesses normal content THEN the System SHALL grant full access with accessType 'vip'
2. WHEN an SVIP user accesses any content THEN the System SHALL grant full access with accessType 'vip'
3. WHEN a user has previously purchased content THEN the System SHALL grant full access with accessType 'purchased'
