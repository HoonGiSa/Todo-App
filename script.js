/**
 * My Tasks - Todo List Application (Step 5 + Keyword Auto-Categorization)
 * Features:
 * - Smart Keyword-Based Auto-Categorization (Real-time keyword detection & visual feedback)
 * - Data Export & Import (JSON backup & file restore with confirm safety dialog)
 * - Sorting Options: Created Date (Desc/Asc), Category, Status, Custom Drag-and-Drop
 * - Sort State Persistence with localStorage
 * - HTML5 Drag & Drop manual reordering (sortable)
 * - High Performance Optimization: DocumentFragment batch rendering, Event Delegation, 100+ items smooth FPS
 * - Dark Mode with persistence (#1A1A1A, #2D2D2D, #E0E0E0)
 * - Real-time Search with Debounce & Category Filter integration
 * - Inline Editing with Category modification & Keyboard shortcuts
 * - Progress Dashboard & Today's Stats
 */

(() => {
  'use strict';

  // 1. 상수 정의
  const STORAGE_KEY = 'MY_TASKS_DATA_V1';
  const THEME_KEY = 'MY_TASKS_THEME_V1';
  const SORT_KEY = 'MY_TASKS_SORT_V1';

  const CATEGORY_MAP = {
    work: { label: '업무', badgeClass: 'badge-work', hintClass: 'hint-work', order: 1 },
    personal: { label: '개인', badgeClass: 'badge-personal', hintClass: 'hint-personal', order: 2 },
    study: { label: '공부', badgeClass: 'badge-study', hintClass: 'hint-study', order: 3 }
  };

  // 키워드 사전 정의
  const KEYWORD_RULES = {
    work: [
      '회의', '미팅', '보고서', '기획', '개발', '배포', '프로젝트', '고객', '메일', '발표', 
      '피드백', '스프린트', '스크럼', '협업', '제안서', '결재', '출장', '업무', '이슈', '버그', 
      '디자인', '문서', '릴리즈', '출근', '퇴근', '납기', '일정', '클라이언트', '서버', '인프라',
      'meeting', 'report', 'project', 'deploy', 'dev', 'bug', 'sprint', 'scrum', 'client'
    ],
    study: [
      '공부', '학습', '강의', '독서', '책', '시험', '과제', '스터디', '자격증', '복습', 
      '예습', '인강', '튜토리얼', '알고리즘', '파이썬', '리액트', '자바스크립트', '영어', 
      '코딩테스트', '논문', '수업', '모의고사', '자료구조', '토익', '토플', '프론트엔드', '백엔드',
      'study', 'learn', 'lecture', 'book', 'exam', 'test', 'course', 'homework', 'algorithm'
    ],
    personal: [
      '운동', '헬스', '병원', '약', '쇼핑', '장보기', '청소', '빨래', '약속', '여행', 
      '친구', '영화', '가족', '산책', '요리', '외식', '식사', '취미', '은행', '송금', 
      '생일', '선물', '카페', '데이트', '청첩장', '분리수거', '환전', '비행기', '숙소',
      'gym', 'workout', 'hospital', 'shopping', 'travel', 'clean', 'cook', 'cafe'
    ]
  };

  // 2. DOM 요소 참조
  const themeToggle = document.getElementById('theme-toggle');
  const themeIcon = document.getElementById('theme-icon');
  const themeLabel = document.getElementById('theme-label');
  const pendingBadge = document.getElementById('pending-badge');

  const progressText = document.getElementById('progress-text');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const todayCount = document.getElementById('today-count');
  const statWorkText = document.getElementById('stat-work-text');
  const miniBarWork = document.getElementById('mini-bar-work');
  const statPersonalText = document.getElementById('stat-personal-text');
  const miniBarPersonal = document.getElementById('mini-bar-personal');
  const statStudyText = document.getElementById('stat-study-text');
  const miniBarStudy = document.getElementById('mini-bar-study');

  const searchInput = document.getElementById('search-input');
  const searchClearBtn = document.getElementById('search-clear-btn');
  const sortSelect = document.getElementById('sort-select');
  const exportBtn = document.getElementById('export-btn');
  const importBtn = document.getElementById('import-btn');
  const importFileInput = document.getElementById('import-file-input');

  const filterButtons = document.querySelectorAll('.filter-btn');
  const todoForm = document.getElementById('todo-form');
  const todoCategory = document.getElementById('todo-category');
  const todoInput = document.getElementById('todo-input');
  const categoryHint = document.getElementById('category-hint');
  const hintText = document.getElementById('hint-text');

  const todoList = document.getElementById('todo-list');
  const emptyState = document.getElementById('empty-state');
  const emptyMessage = document.getElementById('empty-message');
  const emptyHint = document.getElementById('empty-hint');
  const taskCounter = document.getElementById('task-counter');
  const filterStatus = document.getElementById('filter-status');
  const clearCompletedBtn = document.getElementById('clear-completed-btn');

  // 3. 애플리케이션 상태 (State)
  let todos = [];
  let currentFilter = 'all'; // 'all' | 'work' | 'personal' | 'study'
  let currentSort = 'created-desc'; // 'created-desc' | 'created-asc' | 'category' | 'status' | 'custom'
  let searchQuery = '';
  let editingId = null;
  let currentTheme = 'light';
  let draggedId = null; // 드래그 중인 아이템 ID
  let userManuallySelectedCategory = false; // 사용자가 드롭다운을 직접 변경했는지 여부

  /**
   * 텍스트로부터 키워드를 분석하여 추천 카테고리를 반환합니다.
   * @param {string} text 
   * @returns {{ category: string, keyword: string } | null}
   */
  function detectCategoryFromText(text) {
    if (!text || !text.trim()) return null;
    const lowerText = text.toLowerCase();

    // 1. 업무 키워드 검사
    for (const kw of KEYWORD_RULES.work) {
      if (lowerText.includes(kw)) {
        return { category: 'work', keyword: kw };
      }
    }
    // 2. 공부 키워드 검사
    for (const kw of KEYWORD_RULES.study) {
      if (lowerText.includes(kw)) {
        return { category: 'study', keyword: kw };
      }
    }
    // 3. 개인 키워드 검사
    for (const kw of KEYWORD_RULES.personal) {
      if (lowerText.includes(kw)) {
        return { category: 'personal', keyword: kw };
      }
    }

    return null;
  }

  /**
   * 상대적 생성 시간 계산
   * @param {number} timestamp 
   * @returns {string}
   */
  function formatTimeAgo(timestamp) {
    if (!timestamp) return '방금 전';
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return '방금 전';
    } else if (diffMin < 60) {
      return `${diffMin}분 전`;
    } else if (diffHour < 24) {
      return `${diffHour}시간 전`;
    } else if (diffDay === 1) {
      return '어제';
    } else if (diffDay < 30) {
      return `${diffDay}일 전`;
    } else {
      const d = new Date(timestamp);
      return `${d.getMonth() + 1}월 ${d.getDate()}일`;
    }
  }

  /**
   * 테마 초기화
   */
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === 'dark' || savedTheme === 'light') {
      currentTheme = savedTheme;
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      currentTheme = prefersDark ? 'dark' : 'light';
    }
    applyTheme(currentTheme);
  }

  function applyTheme(theme) {
    currentTheme = theme;
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      themeIcon.textContent = '☀️';
      themeLabel.textContent = '라이트 모드';
    } else {
      document.documentElement.removeAttribute('data-theme');
      themeIcon.textContent = '🌙';
      themeLabel.textContent = '다크 모드';
    }
    try {
      localStorage.setItem(THEME_KEY, theme);
    } catch (e) {
      console.error('테마 저장 오류:', e);
    }
  }

  function toggleTheme() {
    applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
  }

  /**
   * 정렬 상태 초기화
   */
  function initSort() {
    const savedSort = localStorage.getItem(SORT_KEY);
    if (savedSort && ['created-desc', 'created-asc', 'category', 'status', 'custom'].includes(savedSort)) {
      currentSort = savedSort;
      sortSelect.value = savedSort;
    }
  }

  function applySort(sortType) {
    currentSort = sortType;
    sortSelect.value = sortType;
    try {
      localStorage.setItem(SORT_KEY, sortType);
    } catch (e) {
      console.error('정렬 설정 저장 오류:', e);
    }
    render();
  }

  /**
   * 데이터 로드 및 마이그레이션
   */
  function loadTodos() {
    try {
      const rawData = localStorage.getItem(STORAGE_KEY);
      if (rawData) {
        const parsed = JSON.parse(rawData);
        if (Array.isArray(parsed)) {
          todos = parsed.map((item) => ({
            id: item.id || 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
            text: item.text || '',
            category: item.category && CATEGORY_MAP[item.category] ? item.category : 'personal',
            completed: Boolean(item.completed),
            createdAt: item.createdAt || Date.now()
          }));
          return;
        }
      }
    } catch (error) {
      console.error('LocalStorage 로드 실패:', error);
    }
    todos = [];
  }

  function saveTodos() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (error) {
      console.error('LocalStorage 저장 실패:', error);
    }
  }

  /**
   * 대시보드 통계 계산
   */
  function updateDashboard() {
    const total = todos.length;
    const completed = todos.filter((t) => t.completed).length;
    const pending = total - completed;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

    progressText.textContent = `${completed}/${total} 완료 (${percent}%)`;
    progressBarFill.style.width = `${percent}%`;
    progressBarFill.setAttribute('aria-valuenow', percent);

    if (total > 0 && percent === 100) {
      progressBarFill.classList.add('all-completed');
    } else {
      progressBarFill.classList.remove('all-completed');
    }

    pendingBadge.innerHTML = `남은 할 일 <strong>${pending}</strong>개`;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const todayAdded = todos.filter((t) => t.createdAt >= startOfToday.getTime()).length;
    todayCount.textContent = todayAdded;

    const updateMiniStat = (categoryKey, textElem, barElem) => {
      const catItems = todos.filter((t) => t.category === categoryKey);
      const catTotal = catItems.length;
      const catCompleted = catItems.filter((t) => t.completed).length;
      const catPercent = catTotal > 0 ? Math.round((catCompleted / catTotal) * 100) : 0;

      textElem.textContent = `${catCompleted}/${catTotal}`;
      barElem.style.width = `${catPercent}%`;
    };

    updateMiniStat('work', statWorkText, miniBarWork);
    updateMiniStat('personal', statPersonalText, miniBarPersonal);
    updateMiniStat('study', statStudyText, miniBarStudy);

    clearCompletedBtn.disabled = completed === 0;
  }

  /**
   * 정렬 알고리즘 적용
   * @param {Array} list 
   * @returns {Array}
   */
  function getSortedList(list) {
    const cloned = [...list];
    switch (currentSort) {
      case 'created-asc':
        return cloned.sort((a, b) => a.createdAt - b.createdAt);
      case 'category':
        return cloned.sort((a, b) => {
          const orderA = CATEGORY_MAP[a.category]?.order || 99;
          const orderB = CATEGORY_MAP[b.category]?.order || 99;
          return orderA - orderB;
        });
      case 'status':
        return cloned.sort((a, b) => {
          return (a.completed ? 1 : 0) - (b.completed ? 1 : 0);
        });
      case 'custom':
        return cloned;
      case 'created-desc':
      default:
        return cloned.sort((a, b) => b.createdAt - a.createdAt);
    }
  }

  /**
   * 필터 및 검색이 결합된 목록 계산
   */
  function getFilteredAndSortedTodos() {
    const filtered = todos.filter((todo) => {
      const matchesCategory = (currentFilter === 'all') || (todo.category === currentFilter);
      const matchesSearch = !searchQuery || todo.text.toLowerCase().includes(searchQuery);
      return matchesCategory && matchesSearch;
    });

    return getSortedList(filtered);
  }

  /**
   * 고성능 DOM 렌더링 (DocumentFragment 활용)
   */
  function render() {
    updateDashboard();

    const itemsToRender = getFilteredAndSortedTodos();

    if (itemsToRender.length === 0) {
      todoList.innerHTML = '';
      emptyState.style.display = 'block';
      if (searchQuery) {
        emptyMessage.textContent = `"${searchQuery}" 검색 결과가 없습니다.`;
        emptyHint.textContent = '다른 검색어를 입력하거나 검색창의 취소 버튼을 눌러보세요.';
      } else if (currentFilter !== 'all') {
        const catLabel = CATEGORY_MAP[currentFilter]?.label || '';
        emptyMessage.textContent = `${catLabel} 카테고리에 할 일이 없습니다.`;
        emptyHint.textContent = '위 입력창에서 새로운 할 일을 추가해보세요!';
      } else {
        emptyMessage.textContent = '할 일이 없습니다. 추가해보세요!';
        emptyHint.textContent = '위 입력창에서 새로운 할 일을 등록해보세요!';
      }
    } else {
      emptyState.style.display = 'none';

      const fragment = document.createDocumentFragment();

      itemsToRender.forEach((todo) => {
        const li = document.createElement('li');
        li.dataset.id = todo.id;
        li.draggable = editingId !== todo.id;

        if (editingId === todo.id) {
          li.className = 'todo-item editing';

          const editWrapper = document.createElement('div');
          editWrapper.className = 'edit-form-wrapper';

          const inputRow = document.createElement('div');
          inputRow.className = 'edit-input-row';

          const editSelect = document.createElement('select');
          editSelect.className = 'edit-category-select';
          editSelect.setAttribute('aria-label', '카테고리 수정');
          ['work', 'personal', 'study'].forEach((key) => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.textContent = CATEGORY_MAP[key].label;
            if (todo.category === key) opt.selected = true;
            editSelect.appendChild(opt);
          });

          const editInput = document.createElement('input');
          editInput.type = 'text';
          editInput.className = 'edit-text-input';
          editInput.value = todo.text;
          editInput.setAttribute('aria-label', '할 일 내용 수정');

          // 인라인 수정 시에도 키워드 자동 감지 지원
          editInput.addEventListener('input', (e) => {
            const detected = detectCategoryFromText(e.target.value);
            if (detected) {
              editSelect.value = detected.category;
            }
          });

          inputRow.appendChild(editSelect);
          inputRow.appendChild(editInput);

          const actionRow = document.createElement('div');
          actionRow.className = 'edit-action-row';

          const hintSpan = document.createElement('span');
          hintSpan.className = 'edit-hint';
          hintSpan.innerHTML = '<kbd>Enter</kbd> 저장 &nbsp; <kbd>ESC</kbd> 취소';

          const btnGroup = document.createElement('div');
          btnGroup.className = 'edit-buttons';

          const saveBtn = document.createElement('button');
          saveBtn.type = 'button';
          saveBtn.className = 'btn-edit-save';
          saveBtn.textContent = '저장';
          saveBtn.dataset.action = 'save-edit';

          const cancelBtn = document.createElement('button');
          cancelBtn.type = 'button';
          cancelBtn.className = 'btn-edit-cancel';
          cancelBtn.textContent = '취소';
          cancelBtn.dataset.action = 'cancel-edit';

          btnGroup.appendChild(saveBtn);
          btnGroup.appendChild(cancelBtn);

          actionRow.appendChild(hintSpan);
          actionRow.appendChild(btnGroup);

          editWrapper.appendChild(inputRow);
          editWrapper.appendChild(actionRow);
          li.appendChild(editWrapper);

          editInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              saveEditing(todo.id, editInput.value, editSelect.value);
            } else if (e.key === 'Escape') {
              e.preventDefault();
              cancelEditing();
            }
          });

          setTimeout(() => {
            editInput.focus();
            editInput.select();
          }, 10);

        } else {
          li.className = `todo-item ${todo.completed ? 'completed' : ''}`;

          const dragHandle = document.createElement('span');
          dragHandle.className = 'drag-handle';
          dragHandle.title = '드래그하여 순서 변경';
          dragHandle.textContent = '⋮⋮';

          const leftDiv = document.createElement('div');
          leftDiv.className = 'todo-item-left';

          const checkbox = document.createElement('input');
          checkbox.type = 'checkbox';
          checkbox.className = 'todo-checkbox';
          checkbox.checked = todo.completed;
          checkbox.dataset.action = 'toggle';
          checkbox.setAttribute('aria-label', `할 일 완료 여부: ${todo.text}`);

          const catConfig = CATEGORY_MAP[todo.category] || CATEGORY_MAP.personal;
          const catBadge = document.createElement('span');
          catBadge.className = `category-badge ${catConfig.badgeClass}`;
          catBadge.textContent = catConfig.label;

          const contentGroup = document.createElement('div');
          contentGroup.className = 'todo-content-group';

          const spanText = document.createElement('span');
          spanText.className = 'todo-text';
          spanText.textContent = todo.text;
          spanText.title = '더블클릭하여 내용을 수정할 수 있습니다';
          spanText.dataset.action = 'toggle';

          const spanTime = document.createElement('span');
          spanTime.className = 'todo-time';
          spanTime.textContent = formatTimeAgo(todo.createdAt);

          contentGroup.appendChild(spanText);
          contentGroup.appendChild(spanTime);

          leftDiv.appendChild(dragHandle);
          leftDiv.appendChild(checkbox);
          leftDiv.appendChild(catBadge);
          leftDiv.appendChild(contentGroup);

          const deleteBtn = document.createElement('button');
          deleteBtn.type = 'button';
          deleteBtn.className = 'btn-delete';
          deleteBtn.dataset.action = 'delete';
          deleteBtn.setAttribute('aria-label', '할 일 삭제');
          deleteBtn.innerHTML = '&times;';

          li.appendChild(leftDiv);
          li.appendChild(deleteBtn);
        }

        fragment.appendChild(li);
      });

      todoList.innerHTML = '';
      todoList.appendChild(fragment);
    }

    const totalCount = todos.length;
    const completedCount = todos.filter((t) => t.completed).length;
    const currentCount = itemsToRender.length;

    if (currentFilter === 'all') {
      taskCounter.textContent = `총 ${totalCount}개 할 일 (완료 ${completedCount}개)`;
      filterStatus.textContent = searchQuery ? `검색 결과 ${currentCount}개` : '전체 보기';
    } else {
      const catLabel = CATEGORY_MAP[currentFilter]?.label || '';
      taskCounter.textContent = `${catLabel} ${currentCount}개 (전체 ${totalCount}개)`;
      filterStatus.textContent = searchQuery ? `${catLabel} 검색 결과` : `${catLabel} 필터링`;
    }
  }

  /**
   * 새로운 할 일 추가
   */
  function addTodo(text, category) {
    const trimmed = text.trim();
    if (!trimmed) return;

    // 만약 사용자가 수동 선택하지 않았다면, 키워드 감지 결과 우선 적용
    let finalCategory = category;
    if (!userManuallySelectedCategory) {
      const detected = detectCategoryFromText(trimmed);
      if (detected) {
        finalCategory = detected.category;
      }
    }

    const validCategory = CATEGORY_MAP[finalCategory] ? finalCategory : 'personal';

    const newTodo = {
      id: 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      text: trimmed,
      category: validCategory,
      completed: false,
      createdAt: Date.now()
    };

    todos.unshift(newTodo);
    saveTodos();
    render();
  }

  function toggleTodo(id) {
    const target = todos.find((t) => t.id === id);
    if (!target) return;
    target.completed = !target.completed;
    saveTodos();
    render();
  }

  function deleteTodoWithAnimation(id, itemElem) {
    if (itemElem) {
      itemElem.classList.add('deleting');
      setTimeout(() => {
        todos = todos.filter((t) => t.id !== id);
        saveTodos();
        render();
      }, 220);
    } else {
      todos = todos.filter((t) => t.id !== id);
      saveTodos();
      render();
    }
  }

  function clearCompletedTodos() {
    const completedCount = todos.filter((t) => t.completed).length;
    if (completedCount === 0) return;

    const isConfirmed = window.confirm(`완료된 ${completedCount}개의 할 일을 모두 삭제하시겠습니까?`);
    if (!isConfirmed) return;

    todos = todos.filter((t) => !t.completed);
    saveTodos();
    render();
  }

  function startEditing(id) {
    editingId = id;
    render();
  }

  function saveEditing(id, newText, newCategory) {
    const trimmed = newText.trim();
    if (!trimmed) {
      cancelEditing();
      return;
    }

    const target = todos.find((t) => t.id === id);
    if (target) {
      target.text = trimmed;
      if (CATEGORY_MAP[newCategory]) {
        target.category = newCategory;
      }
      saveTodos();
    }

    editingId = null;
    render();
  }

  function cancelEditing() {
    editingId = null;
    render();
  }

  function setFilter(filter) {
    currentFilter = filter;
    filterButtons.forEach((btn) => {
      if (btn.dataset.filter === filter) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
    render();
  }

  // ============================================================
  // 4. 데이터 내보내기 & 가져오기 (Export & Import)
  // ============================================================

  function exportData() {
    if (todos.length === 0) {
      alert('내보낼 할 일 데이터가 없습니다.');
      return;
    }

    const dataStr = JSON.stringify(todos, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0');
    const filename = `my_tasks_backup_${dateStr}_${timeStr}.json`;

    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = filename;
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(url);
  }

  function handleImportFile(file) {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (!Array.isArray(parsed)) {
          throw new Error('올바른 백업 파일 형식이 아닙니다 (배열 형태 필요).');
        }

        const validTodos = parsed.map((item) => ({
          id: item.id || 'task_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          text: String(item.text || '').trim(),
          category: item.category && CATEGORY_MAP[item.category] ? item.category : 'personal',
          completed: Boolean(item.completed),
          createdAt: Number(item.createdAt) || Date.now()
        })).filter(item => item.text.length > 0);

        if (validTodos.length === 0) {
          alert('가져올 유효한 할 일 항목이 파일 내에 없습니다.');
          return;
        }

        const msg = `기존 ${todos.length}개의 할 일이 백업 파일의 ${validTodos.length}개 할 일로 대체됩니다.\n계속 진행하시겠습니까?`;
        if (window.confirm(msg)) {
          todos = validTodos;
          saveTodos();
          render();
          alert(`성공적으로 ${validTodos.length}개의 할 일을 가져왔습니다!`);
        }
      } catch (err) {
        alert('파일을 가져오는 중 오류가 발생했습니다: ' + err.message);
      } finally {
        importFileInput.value = '';
      }
    };
    reader.readAsText(file);
  }

  // ============================================================
  // 5. 드래그 앤 드롭 수동 정렬 (Drag & Drop)
  // ============================================================

  todoList.addEventListener('dragstart', (e) => {
    const li = e.target.closest('.todo-item');
    if (!li || editingId) return;

    draggedId = li.dataset.id;
    li.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedId);
  });

  todoList.addEventListener('dragover', (e) => {
    e.preventDefault();
    const targetLi = e.target.closest('.todo-item');
    if (!targetLi || targetLi.dataset.id === draggedId) return;

    const bounding = targetLi.getBoundingClientRect();
    const offset = e.clientY - bounding.top;
    
    if (offset < bounding.height / 2) {
      targetLi.classList.add('drag-over-top');
      targetLi.classList.remove('drag-over-bottom');
    } else {
      targetLi.classList.add('drag-over-bottom');
      targetLi.classList.remove('drag-over-top');
    }
  });

  todoList.addEventListener('dragleave', (e) => {
    const targetLi = e.target.closest('.todo-item');
    if (targetLi) {
      targetLi.classList.remove('drag-over-top', 'drag-over-bottom');
    }
  });

  todoList.addEventListener('drop', (e) => {
    e.preventDefault();
    const targetLi = e.target.closest('.todo-item');
    if (!targetLi || !draggedId || targetLi.dataset.id === draggedId) return;

    const targetId = targetLi.dataset.id;
    const isOverTop = targetLi.classList.contains('drag-over-top');

    targetLi.classList.remove('drag-over-top', 'drag-over-bottom');

    const fromIndex = todos.findIndex((t) => t.id === draggedId);
    let toIndex = todos.findIndex((t) => t.id === targetId);

    if (fromIndex !== -1 && toIndex !== -1) {
      const [movedItem] = todos.splice(fromIndex, 1);
      toIndex = todos.findIndex((t) => t.id === targetId);
      const insertIndex = isOverTop ? toIndex : toIndex + 1;
      todos.splice(insertIndex, 0, movedItem);

      currentSort = 'custom';
      sortSelect.value = 'custom';
      try {
        localStorage.setItem(SORT_KEY, 'custom');
      } catch (err) {
        console.error(err);
      }

      saveTodos();
      render();
    }
  });

  todoList.addEventListener('dragend', () => {
    draggedId = null;
    const items = todoList.querySelectorAll('.todo-item');
    items.forEach((item) => {
      item.classList.remove('dragging', 'drag-over-top', 'drag-over-bottom');
    });
  });

  // ============================================================
  // 6. 이벤트 위임(Event Delegation)으로 성능 극대화
  // ============================================================

  todoList.addEventListener('click', (e) => {
    const target = e.target;
    const li = target.closest('.todo-item');
    if (!li) return;
    const id = li.dataset.id;

    if (target.dataset.action === 'delete' || target.classList.contains('btn-delete')) {
      e.stopPropagation();
      deleteTodoWithAnimation(id, li);
      return;
    }

    if (target.dataset.action === 'toggle' || target.classList.contains('todo-checkbox')) {
      toggleTodo(id);
      return;
    }

    if (target.dataset.action === 'save-edit') {
      const editInput = li.querySelector('.edit-text-input');
      const editSelect = li.querySelector('.edit-category-select');
      if (editInput && editSelect) {
        saveEditing(id, editInput.value, editSelect.value);
      }
      return;
    }

    if (target.dataset.action === 'cancel-edit') {
      cancelEditing();
      return;
    }
  });

  todoList.addEventListener('dblclick', (e) => {
    const target = e.target;
    if (target.classList.contains('todo-text')) {
      const li = target.closest('.todo-item');
      if (li && li.dataset.id) {
        e.stopPropagation();
        startEditing(li.dataset.id);
      }
    }
  });

  // ============================================================
  // 7. 실시간 키워드 자동 감지 및 폼 이벤트 리스너
  // ============================================================

  // 할 일 입력창 타이핑 시 실시간 키워드 감지
  todoInput.addEventListener('input', (e) => {
    const val = e.target.value;
    if (!val.trim()) {
      categoryHint.style.display = 'none';
      return;
    }

    const detected = detectCategoryFromText(val);

    if (detected) {
      const catConfig = CATEGORY_MAP[detected.category];
      
      // 사용자가 직접 변경하지 않은 경우, 셀렉트박스를 자동으로 전환
      if (!userManuallySelectedCategory) {
        todoCategory.value = detected.category;
        
        // 부드러운 하이라이트 애니메이션
        todoCategory.classList.add('highlight-auto');
        setTimeout(() => {
          todoCategory.classList.remove('highlight-auto');
        }, 300);
      }

      // 힌트 배지 표시
      categoryHint.style.display = 'inline-flex';
      categoryHint.className = `category-hint ${catConfig.hintClass}`;
      hintText.textContent = `'${detected.keyword}' 키워드 감지 ➔ [${catConfig.label}] 자동 추천`;
    } else {
      categoryHint.style.display = 'none';
    }
  });

  // 사용자가 셀렉트박스를 직접 조작하면 수동 선택 상태로 전환
  todoCategory.addEventListener('change', () => {
    userManuallySelectedCategory = true;
  });

  // 폼 제출
  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = todoInput.value;
    const category = todoCategory.value;

    if (text.trim()) {
      addTodo(text, category);
      todoInput.value = '';
      categoryHint.style.display = 'none';
      userManuallySelectedCategory = false; // 리셋
    }
    todoInput.focus();
  });

  // ============================================================
  // 8. 기타 컨트롤 바 & 단축키 이벤트 리스너 등록
  // ============================================================

  themeToggle.addEventListener('click', toggleTheme);

  sortSelect.addEventListener('change', (e) => {
    applySort(e.target.value);
  });

  exportBtn.addEventListener('click', exportData);
  importBtn.addEventListener('click', () => importFileInput.click());
  importFileInput.addEventListener('change', (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImportFile(e.target.files[0]);
    }
  });

  let searchTimer = null;
  searchInput.addEventListener('input', (e) => {
    const val = e.target.value;
    searchClearBtn.style.display = val ? 'block' : 'none';

    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      searchQuery = val.toLowerCase().trim();
      render();
    }, 80);
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchQuery = '';
    searchClearBtn.style.display = 'none';
    searchInput.focus();
    render();
  });

  filterButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      setFilter(btn.dataset.filter);
    });
  });

  clearCompletedBtn.addEventListener('click', clearCompletedTodos);

  document.addEventListener('keydown', (e) => {
    if (e.altKey && !e.ctrlKey && !e.shiftKey) {
      const key = e.key.toLowerCase();
      if (key === 'n') {
        e.preventDefault();
        todoInput.focus();
      } else if (key === '1') {
        e.preventDefault();
        setFilter('all');
      } else if (key === '2') {
        e.preventDefault();
        setFilter('work');
      } else if (key === '3') {
        e.preventDefault();
        setFilter('personal');
      } else if (key === '4') {
        e.preventDefault();
        setFilter('study');
      }
    }
  });

  // 9. 초기화 실행
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initSort();
    loadTodos();
    render();
    todoInput.focus();
  });
})();
