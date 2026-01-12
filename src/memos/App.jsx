import { DndContext, DragOverlay, pointerWithin, TouchSensor, MouseSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import styles from "./App.module.scss";
import SortableTask from "./SortableTask";
import { useMemos, useMemosSync } from "./useMemos";
import SortableCategory from "./SortableCategory";
import React from "react";
import { useSession, signOut } from 'next-auth/react';

// 追加: タイトル正規化（このファイル内でも使用）
const normalizeTitle = (s) => (s || '').trim().toLowerCase();

const arrowSize = 35;
const arrowStrokeWidth = 2;

function App() {
  const {
    text,
    setText,
    taskInputs,
    setTaskInputs,
    memos,
    setMemos,
    saveMemosToServer,
    loadMemosFromServer,
    addCategory,
    addTaskToCategory,
    toogleTaskDone,
    deleteTaskById,
    deleteCategory,
    showTaskInput,
    toggleTaskInput,
    isAltColor,
    setIsAltColor,
    activeTask,
    activeCategory,
    handleDragStart,
    handleDragEnd,
    handleDragCancel,
    collapsedCategories,
    toggleCategoryCollapse,
    showSidebar,
    setShowSidebar,
    isMobile,
    mobileCategoryIndex,
    setMobileCategoryIndex,
    handlePrevCategory,
    handleNextCategory,
  } = useMemos();

  // enable auto-load / auto-save behavior (uses session internally)
  useMemosSync(memos, setMemos);
  const { status } = useSession();

  // サインイン直後のみ一度だけロード
  const didInitialLoad = React.useRef(false);
  React.useEffect(() => {
    if (status === 'authenticated' && !didInitialLoad.current) {
      didInitialLoad.current = true;
      loadMemosFromServer().then(() => {
        console.log('[load] loaded memos from server');
      });
    }
  }, [status, loadMemosFromServer]);

  // DnD Kitのセンサー設定（マウス・タッチ対応）
  const sensors = useSensors(
    useSensor(MouseSensor),
    useSensor(TouchSensor)
  );

  // テーマ切り替え（bodyのクラスを変更）
  React.useEffect(() => {
    document.body.classList.remove(styles.themeA, styles.themeB);
    document.body.classList.add(isAltColor ? styles.themeB : styles.themeA);
  }, [isAltColor]);

  React.useEffect(() => {
    if (!isMobile || showSidebar || memos.length === 0) return;

    const current = memos[mobileCategoryIndex];
    if (current && !collapsedCategories.includes(normalizeTitle(current.category))) return;

    for (let offset = 1; offset < memos.length; offset += 1) {
      const nextIdx = (mobileCategoryIndex + offset) % memos.length;
      if (!collapsedCategories.includes(normalizeTitle(memos[nextIdx].category))) {
        setMobileCategoryIndex(nextIdx);
        break;
      }
    }
  }, [isMobile, showSidebar, memos, collapsedCategories, mobileCategoryIndex, setMobileCategoryIndex]);

  return (
    // テーマとレイアウトのコンテナ
    <div className={`${isAltColor ? styles.themeB : styles.themeA} ${styles.container}`}>
      {/* ヘッダー部 */}
      <div className={styles.header}>
        <div className={styles.headerContainer}>
          <div className={styles.title}>SortNote</div>
          <div className={styles.toggleContainer}>
            <div>Theme Color</div>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={isAltColor}
                onChange={() => setIsAltColor((prev) => !prev)}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
          <div className={styles.toggleContainer}>
            <div>Memobox</div>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={showSidebar}
                onChange={() => setShowSidebar((prev) => !prev)}
              />
              <span className={styles.slider}></span>
            </label>
          </div>
        </div>
        {status === 'authenticated' && (
          <button
            className={styles.logoutBtn}
            onClick={() => signOut({ callbackUrl: '/login' })}
            aria-label="ログアウト"
          >
            logout
          </button>
        )}
      </div>
      <br />
      <div className={styles.body}>
        {/* サイドバー（折り畳み中カテゴリー一覧と追加UI） */}
        {showSidebar && (
          <div className={styles.sidebar}>
            <div className={styles.categoryInputStyle}>
              <input
                className={styles.categoryInput}
                placeholder=" input category here"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    addCategory();
                  }
                }}
              />
              <button
                className={styles.categoryAddBtn}
                onClick={addCategory}
              >
                add
              </button>
            </div>
            {/* 折り畳み中カテゴリーの一覧表示（タイトルで判定） */}
            {memos
              .filter(cat => collapsedCategories.includes(normalizeTitle(cat.category)))
              .map(cat => (
                <div
                  key={cat.id}
                  className={styles.sidebarCategory}
                  onClick={() => toggleCategoryCollapse(cat.category)}
                >
                  {cat.category}
                </div>
              ))}
          </div>
        )}

        {/* メイン画面（カテゴリー・タスク一覧） */}
        <div className={styles.mainContainer}>
          {/* モバイル時のみカテゴリー切り替えボタン（左） */}
          {isMobile && memos.length > 1 && !showSidebar && (
            <div className={styles.categorySwitchArrows}>
              <button
                className={styles.categoryArrowBtn}
                onClick={handlePrevCategory}
                aria-label="前のカテゴリー"
              >
                <svg
                  width={arrowSize}
                  height={arrowSize}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  focusable="false"
                  style={{ transform: 'rotate(180deg)' }}
                >
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="var(--arrow-color)"
                    strokeWidth={arrowStrokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
          <div className={styles.category}>
            {/* DnD Kitのドラッグ＆ドロップコンテキスト */}
            <DndContext
              sensors={sensors}
              collisionDetection={pointerWithin}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
              onDragCancel={handleDragCancel}
            >
              {/* カテゴリーの並び替えコンテキスト */}
              <SortableContext
                items={memos.map(cat => cat.id)}
                strategy={verticalListSortingStrategy}
              >
                {/* 折り畳み中以外のカテゴリーを表示 */}
                {memos
                  .map((categoryItem, realIndex) => {
                    // 折り畳み中のカテゴリーは早期リターン（タイトルで判定）
                    if (collapsedCategories.includes(normalizeTitle(categoryItem.category))) {
                      return null;
                    }

                    return (
                      <div 
                        key={categoryItem.id}
                        className={`
                          ${styles.categoryWrapper} 
                          ${isMobile && !showSidebar && realIndex !== mobileCategoryIndex 
                            ? styles.hiddenOnMobile 
                            : ''
                          }
                        `}
                      >
                        <SortableCategory
                          id={categoryItem.id}
                          label={categoryItem.category}
                          onDelete={() => {
                            if (window.confirm("本当にこのカテゴリを削除しますか？")) {
                              deleteCategory(realIndex);
                            }
                          }}
                          onCollapse={() => toggleCategoryCollapse(categoryItem.category)}
                        >
                          <div className={styles.categoryContainer}>
                            <div>
                              {/* タスクの並び替えコンテキスト */}
                              <SortableContext
                                items={categoryItem.tasks?.map(task => task.id) || []}
                                strategy={verticalListSortingStrategy}
                              >
                                {/* タスク一覧表示 */}
                                {(categoryItem.tasks || [])
                                  .slice()
                                  .sort((a, b) => a.done - b.done)
                                  .map((taskItem) => (
                                    <SortableTask
                                      key={taskItem.id}
                                      id={taskItem.id}
                                      text={taskItem.text}
                                      done={taskItem.done}
                                      onToggle={() => toogleTaskDone(realIndex, taskItem.id)} // 正しいインデックス
                                      onDelete={() => deleteTaskById(categoryItem.id, taskItem.id)} // categoryItem.idはID
                                    />
                                  ))}
                              </SortableContext>
                              
                              {/* タスク追加UI */}
                              <div className={styles.inputBtnContainer}>
                                <div className={styles.inputBtn}>
                                  <span
                                    className={styles.inputToggleIcon}
                                    onClick={() => toggleTaskInput(realIndex)} // 正しいインデックス
                                    tabIndex={0}
                                    role="button"
                                    aria-label="タスク入力欄の表示切替"
                                    style={{ marginTop: "0.5rem" }}
                                  >
                                    {showTaskInput[realIndex] ? "−" : "+"} {/* 正しいインデックス */}
                                  </span>
                                </div>
                                <div>
                                  {showTaskInput[realIndex] && ( // 正しいインデックス
                                    <div className={styles.memoInputStyle}>
                                      <input
                                        className={styles.memoInput}
                                        placeholder="input task"
                                        value={taskInputs[realIndex] || ""} // 正しいインデックス
                                        onChange={e => {
                                          const newInputs = [...taskInputs];
                                          newInputs[realIndex] = e.target.value; // 正しいインデックス
                                          setTaskInputs(newInputs);
                                        }}
                                        onKeyDown={e => {
                                          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            addTaskToCategory(realIndex, taskInputs[realIndex]); // 正しいインデックス
                                          }
                                        }}
                                      />
                                      <button
                                        className={styles.addBtn}
                                        onClick={() => {
                                          addTaskToCategory(realIndex, taskInputs[realIndex]); // 正しいインデックス
                                        }}
                                      >
                                        add
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </SortableCategory>
                      </div>
                    );
                  })
                  .filter(Boolean) // null要素を除去
                }
              </SortableContext>
              {/* ドラッグ中のオーバーレイ表示（ドラッグ状態に依存） */}
              <DragOverlay>
                {activeTask ? (
                  <SortableTask
                    id={activeTask.id}
                    text={activeTask.text}
                    done={activeTask.done}
                    onToggle={() => {}}
                    onDelete={() => {}}
                    isOverlay={true}
                  />
                ) : activeCategory ? (
                  <SortableCategory
                    id={activeCategory.id}
                    label={activeCategory.label}
                    isOverlay={true}
                  >
                    <div className={`${styles.categoryContainer} ${styles.categoryContainerOverlay}`}>
                      {activeCategory.tasks?.map((taskItem) => (
                        <SortableTask
                          key={taskItem.id}
                          id={taskItem.id}
                          text={taskItem.text}
                          done={taskItem.done}
                          onToggle={() => {}}
                          onDelete={() => {}}
                          isParentOverlay={true}
                        />
                      ))}
                    </div>
                  </SortableCategory>
                ) : null}
              </DragOverlay>
            </DndContext>
          </div>
          {/* モバイル時のみカテゴリー切り替えボタン（右） */}
          {isMobile && memos.length > 1 && !showSidebar && (
            <div className={styles.categorySwitchArrows}>
              <button
                className={styles.categoryArrowBtn}
                onClick={handleNextCategory}
                aria-label="次のカテゴリー"
              >
                <svg
                  width={arrowSize}
                  height={arrowSize}
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="var(--arrow-color)"
                    strokeWidth={arrowStrokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
