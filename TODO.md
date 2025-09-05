# OpChan TODO - Missing Features & Improvements

This document outlines the features and improvements that still need to be implemented to fully satisfy the FURPS requirements for the Waku Forum.

## 🚨 High Priority (1-2 weeks)

### 1. Bookmarking System

- **Requirement**: "Users can bookmark posts and topics; local only"
- **Status**: ❌ Not implemented
- **Missing**:
  - [ ] Local storage implementation for bookmarked posts/topics
  - [ ] Bookmark UI components (bookmark button, bookmark list)
  - [ ] Bookmark management interface
  - [ ] Bookmark persistence across sessions
- **Impact**: Users cannot save content for later reference
- **Estimated Effort**: 2-3 days

### 2. Call Sign Setup & Display

- **Requirement**: "Users can setup a call sign; bitcoin identity operator unique name - remains - ordinal used as avatar"
- **Status**: ⚠️ Partially implemented
- **Missing**:
  - [ ] Complete call sign setup UI integration
  - [ ] Ordinal avatar display and integration
  - [ ] User profile settings interface
  - [ ] Call sign validation and uniqueness checks
- **Impact**: Users cannot customize their forum identity
- **Estimated Effort**: 3-4 days

### 3. Cell Icon System

- **Requirement**: "Cell can be created with a name, description, icon; icon size will be restricted"
- **Status**: ❌ Not implemented
- **Missing**:
  - [ ] Icon upload/selection interface
  - [ ] Icon size restrictions and validation
  - [ ] Icon display in cell listings and details
  - [ ] Icon storage and management
- **Impact**: Cells lack visual identity and branding
- **Estimated Effort**: 2-3 days

## 🔶 Medium Priority (2-3 weeks)

### 4. Enhanced Sorting Options

- **Requirement**: "Users can sort topics per new or top"
- **Status**: ⚠️ Basic implementation exists
- **Missing**:
  - [ ] "Top" sorting by votes/relevance
  - [ ] UI controls for sorting preferences
  - [ ] Persistent sorting preferences
  - [ ] Sort option indicators in UI
- **Impact**: Limited content discovery options
- **Estimated Effort**: 1-2 days

### 5. Active Member Count Display

- **Requirement**: "A user can see the number of active members per cell; deduced from retrievable activity"
- **Status**: ⚠️ Calculated in backend but not shown
- **Missing**:
  - [ ] UI components to display active member counts
  - [ ] Member count updates in real-time
  - [ ] Member activity indicators
- **Impact**: Users cannot gauge cell activity levels
- **Estimated Effort**: 1 day

### 6. IndexedDB Integration

- **Requirement**: "store message cache in indexedDB -- make app local-first"
- **Status**: ❌ In-memory caching only
- **Missing**:
  - [ ] IndexedDB schema design
  - [ ] Message persistence layer
  - [ ] Offline-first capabilities
  - [ ] Cache synchronization logic
- **Impact**: No offline support, data lost on refresh
- **Estimated Effort**: 3-4 days

### 7. Enhanced Moderation UI

- **Requirement**: "Cell admin can mark posts and comments as moderated"
- **Status**: ⚠️ Backend logic exists, basic UI
- **Missing**:
  - [ ] Rich moderation interface
  - [ ] Moderation history and audit trail
  - [ ] Bulk moderation actions
  - [ ] Moderation reason templates
  - [ ] Moderation statistics dashboard
- **Impact**: Limited moderation capabilities for cell admins
- **Estimated Effort**: 2-3 days

## 🔵 Low Priority (3-4 weeks)

### 8. Anonymous User Experience

- **Requirement**: "Anonymous users can upvote, comments and post"
- **Status**: ⚠️ Basic support but limited UX
- **Missing**:
  - [ ] Better anonymous user flow
  - [ ] Clear permission indicators
  - [ ] Anonymous user onboarding
  - [ ] Anonymous user limitations display
- **Impact**: Poor experience for non-authenticated users
- **Estimated Effort**: 2-3 days

### 9. Relevance Score Visibility

- **Requirement**: "The relevance index is used to push most relevant posts and comments on top"
- **Status**: ⚠️ Calculated but limited visibility
- **Missing**:
  - [ ] Better relevance score indicators
  - [ ] Relevance-based filtering options
  - [ ] Relevance score explanations
  - [ ] Relevance score trends
- **Impact**: Users don't understand content ranking
- **Estimated Effort**: 1-2 days

### 10. Mobile Responsiveness

- **Requirement**: "Users do not need any software beyond a browser to use the forum"
- **Status**: ❌ Basic responsive design
- **Missing**:
  - [ ] Full mobile-optimized experience
  - [ ] Touch-friendly interactions
  - [ ] Mobile-specific navigation
  - [ ] Responsive image handling
- **Impact**: Poor mobile user experience
- **Estimated Effort**: 3-4 days

## 🛠️ Technical Debt & Infrastructure

### 11. Performance Optimizations

- [ ] Implement virtual scrolling for large lists
- [ ] Add message pagination
- [ ] Optimize relevance calculations
- [ ] Implement lazy loading for images

### 12. Testing & Quality

- [ ] Add comprehensive unit tests
- [ ] Implement integration tests
- [ ] Add end-to-end testing
- [ ] Performance testing and monitoring

### 13. Documentation

- [ ] API documentation
- [ ] User guide
- [ ] Developer setup guide
- [ ] Architecture documentation

## 📋 Implementation Notes

### Dependencies

- Bookmarking system depends on IndexedDB integration
- Call sign setup depends on user profile system completion
- Enhanced moderation depends on existing moderation backend

### Technical Considerations

- Use React Query for state management
- Implement proper error boundaries
- Add loading states for all async operations
- Ensure accessibility compliance
- Follow existing code patterns and conventions

### Testing Strategy

- Unit tests for utility functions
- Integration tests for hooks and contexts
- Component tests for UI elements
- End-to-end tests for user flows

## 🎯 Success Metrics

- [ ] All FURPS requirements satisfied
- [ ] 90%+ test coverage
- [ ] Lighthouse performance score > 90
- [ ] Accessibility score > 95
- [ ] Mobile usability score > 90

## 📅 Timeline Estimate

- **Phase 1 (High Priority)**: 1-2 weeks
- **Phase 2 (Medium Priority)**: 2-3 weeks
- **Phase 3 (Low Priority)**: 3-4 weeks
- **Total Estimated Time**: 6-9 weeks

---

_Last updated: [Current Date]_
_Based on FURPS requirements analysis and codebase review_
