# Implementation Plan

- [x] 1. Update backend paywall service and types





  - [x] 1.1 Update AccessType and AccessResult types in paywall.service.ts


    - Change AccessType from 'preview' to 'locked'
    - Remove previewDuration from AccessResult interface
    - _Requirements: 2.1, 4.1_
  - [x] 1.2 Modify checkAccess function to return 'locked' instead of 'preview'


    - Update the no-access return block to use 'locked' accessType
    - Remove previewDuration from the response
    - _Requirements: 2.1, 2.2, 4.1_
  - [ ]* 1.3 Write property test for access type determination
    - **Property 1: Access type determination based on user status**
    - **Validates: Requirements 2.1, 5.1, 5.2, 5.3**
  - [ ]* 1.4 Write property test for locked response structure
    - **Property 2: Locked response structure**
    - **Validates: Requirements 2.2, 4.1, 4.2**

- [x] 2. Update frontend hooks and types





  - [x] 2.1 Update AccessType in useContentAccess.ts


    - Change 'preview' to 'locked' in type definition
    - Update default return for unauthenticated users to use 'locked'
    - _Requirements: 2.1, 2.3_
  - [ ]* 2.2 Write property test for full access response structure
    - **Property 3: Full access response structure**
    - **Validates: Requirements 1.2, 4.1**

- [x] 3. Simplify play page component





  - [x] 3.1 Remove preview-related state variables from PlayPage


    - Remove previewDuration, previewExpired, previewTimeRef states
    - Remove preview time tracking logic from handleTimeUpdate
    - _Requirements: 1.1, 1.3_
  - [x] 3.2 Update access control logic to show modal immediately for locked content


    - Show UnlockPromptModal when accessType is 'locked' without playing video
    - Display video poster as background when content is locked
    - _Requirements: 1.1, 3.1, 3.2_
  - [x] 3.3 Remove Preview Mode Indicator UI component


    - Remove the amber badge showing "试看中 · X分钟"
    - _Requirements: 1.3_
  - [x] 3.4 Update modal close behavior for locked content


    - Navigate back or show content details when modal is closed
    - _Requirements: 3.3_

- [x] 4. Update UnlockPromptModal component






  - [x] 4.1 Remove "试看时间已结束" notice from modal

    - Remove the preview expired notice section
    - Update modal to show generic unlock prompt
    - _Requirements: 3.1_

- [ ] 5. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Update API documentation and cleanup





  - [x] 6.1 Update content access API route documentation


    - Update JSDoc comments to reflect new response structure
    - Remove previewDuration from response documentation
    - _Requirements: 4.2, 4.3_
  - [ ]* 6.2 Write property test for price consistency
    - **Property 4: Price consistency with source category**
    - **Validates: Requirements 2.2**

- [ ] 7. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
