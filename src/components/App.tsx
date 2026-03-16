import { TouchSensor, MouseSensor, useSensor, useSensors } from "@dnd-kit/core";
import styles from "@/styles/App.module.scss";
import { useNotes } from "@/hooks/useNotes";
import { useNotesSync } from "@/hooks/useNotesSync";
import React from "react";
import { NotesLoadingState } from "./notes/NotesLoadingState";
import { NotesHeader } from "./notes/NotesHeader";
import { NotesSidebar } from "./notes/NotesSidebar";
import { NotesList } from "./notes/NotesList";
import { MobileCategoryNav } from "./notes/MobileCategoryNav";

/**
 * メインアプリケーションコンポーネント
 * 各サブコンポーネントを統合し、テーマ管理とレイアウトを担当
 */
function App() {
  const notesState = useNotes();
  const {
    text,
    setText,
    taskInputs,
    setTaskInputs,
    memos,
    setMemos,
    addCategory,
    addTaskToCategory,
    toggleTaskDone,
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
    toggleCategoryCollapse,
    showSidebar,
    setShowSidebar,
    isMobile,
    mobileCategoryIndex,
    setMobileCategoryIndex,
    handlePrevCategory,
    handleNextCategory,
  } = notesState;

  const { isReady } = useNotesSync(memos, setMemos);

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

  // モバイル時の折り畳みカテゴリー自動切り替え
  React.useEffect(() => {
    if (!isMobile || showSidebar || memos.length === 0) return;

    const current = memos[mobileCategoryIndex];
    if (current && !current.collapsed) return;

    for (let offset = 1; offset < memos.length; offset += 1) {
      const nextIdx = (mobileCategoryIndex + offset) % memos.length;
      if (!memos[nextIdx].collapsed) {
        setMobileCategoryIndex(nextIdx);
        break;
      }
    }
  }, [isMobile, showSidebar, memos, mobileCategoryIndex, setMobileCategoryIndex]);

  // 初回ロード中の表示
  if (!isReady) {
    return <NotesLoadingState isAltColor={isAltColor} />;
  }

  const showMobileNav = isMobile && memos.length > 1 && !showSidebar;

  return (
    <div className={`${isAltColor ? styles.themeB : styles.themeA} ${styles.container}`}>
      <NotesHeader
        isAltColor={isAltColor}
        setIsAltColor={setIsAltColor}
        showSidebar={showSidebar}
        setShowSidebar={setShowSidebar}
        isAuthenticated={true}
      />

      <div className={styles.body}>
        {showSidebar && (
          <NotesSidebar
            text={text}
            setText={setText}
            memos={memos}
            addCategory={addCategory}
            toggleCategoryCollapse={toggleCategoryCollapse}
          />
        )}

        {!(isMobile && showSidebar) && (
          <div className={styles.mainContainer}>
            {showMobileNav && (
              <MobileCategoryNav
                direction="left"
                onClick={handlePrevCategory}
              />
            )}

            <NotesList
              memos={memos}
              sensors={sensors}
              handleDragStart={handleDragStart}
              handleDragEnd={handleDragEnd}
              handleDragCancel={handleDragCancel}
              activeTask={activeTask}
              activeCategory={activeCategory}
              isMobile={isMobile}
              showSidebar={showSidebar}
              mobileCategoryIndex={mobileCategoryIndex}
              toggleTaskDone={toggleTaskDone}
              deleteTaskById={deleteTaskById}
              deleteCategory={deleteCategory}
              toggleCategoryCollapse={toggleCategoryCollapse}
              showTaskInput={showTaskInput}
              toggleTaskInput={toggleTaskInput}
              taskInputs={taskInputs}
              setTaskInputs={setTaskInputs}
              addTaskToCategory={addTaskToCategory}
            />

            {showMobileNav && (
              <MobileCategoryNav
                direction="right"
                onClick={handleNextCategory}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
