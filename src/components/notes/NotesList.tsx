import { DndContext, DragOverlay, pointerWithin } from "@dnd-kit/core";
import type { SensorDescriptor, SensorOptions, DragStartEvent, DragEndEvent } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import styles from "@/styles/App.module.scss";
import SortableTask from "../SortableTask";
import SortableCategory from "../SortableCategory";
import type { Memo, Task, ActiveCategory } from '@/types/notes';

interface NotesListProps {
  memos: Memo[];
  sensors: SensorDescriptor<SensorOptions>[];
  handleDragStart: (event: DragStartEvent) => void;
  handleDragEnd: (event: DragEndEvent) => void;
  handleDragCancel: () => void;
  activeTask: Task | null;
  activeCategory: ActiveCategory | null;
  isMobile: boolean;
  showSidebar: boolean;
  mobileCategoryIndex: number;
  toggleTaskDone: (catIdx: number, taskId: string) => Promise<void>;
  deleteTaskById: (categoryId: string, taskId: string) => Promise<void>;
  deleteCategory: (catIdx: number) => Promise<void>;
  toggleCategoryCollapse: (categoryId: string) => Promise<void>;
  showTaskInput: Record<number, boolean>;
  toggleTaskInput: (categoryIndex: number) => void;
  taskInputs: string[];
  setTaskInputs: (value: string[]) => void;
  addTaskToCategory: (catIdx: number, task: string) => Promise<void>;
}

/**
 * カテゴリー一覧とドラッグ&ドロップコンテキストを管理するコンポーネント
 */
export function NotesList({
  memos,
  sensors,
  handleDragStart,
  handleDragEnd,
  handleDragCancel,
  activeTask,
  activeCategory,
  isMobile,
  showSidebar,
  mobileCategoryIndex,
  toggleTaskDone,
  deleteTaskById,
  deleteCategory,
  toggleCategoryCollapse,
  showTaskInput,
  toggleTaskInput,
  taskInputs,
  setTaskInputs,
  addTaskToCategory,
}: NotesListProps) {
  return (
    <div className={styles.category}>
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <SortableContext
          items={memos.map(cat => cat.id)}
          strategy={() => null}
        >
          {memos
            .map((categoryItem, realIndex) => {
              if (categoryItem.collapsed) {
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
                    onCollapse={() => toggleCategoryCollapse(categoryItem.id)}
                  >
                    <div className={styles.categoryContainer}>
                      <div>
                        <SortableContext
                          items={categoryItem.tasks?.map(task => task.id) || []}
                          strategy={() => null}
                        >
                          {(categoryItem.tasks || [])
                            .slice()
                            .sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0))
                            .map((taskItem) => (
                              <SortableTask
                                key={taskItem.id}
                                id={taskItem.id}
                                text={taskItem.text}
                                done={taskItem.done}
                                onToggle={() => toggleTaskDone(realIndex, taskItem.id)}
                                onDelete={() => deleteTaskById(categoryItem.id, taskItem.id)}
                              />
                            ))}
                        </SortableContext>

                        {/* タスク追加UI */}
                        <div className={styles.inputBtnContainer}>
                          <div className={styles.inputBtn}>
                            <span
                              className={styles.inputToggleIcon}
                              onClick={() => toggleTaskInput(realIndex)}
                              tabIndex={0}
                              role="button"
                              aria-label="タスク入力欄の表示切替"
                              style={{ marginTop: "0.5rem" }}
                            >
                              {showTaskInput[realIndex] ? "−" : "+"}
                            </span>
                          </div>
                          <div>
                            {showTaskInput[realIndex] && (
                              <div className={styles.memoInputStyle}>
                                <input
                                  className={styles.memoInput}
                                  placeholder="input task"
                                  value={taskInputs[realIndex] || ""}
                                  onChange={e => {
                                    const newInputs = [...taskInputs];
                                    newInputs[realIndex] = e.target.value;
                                    setTaskInputs(newInputs);
                                  }}
                                  onKeyDown={e => {
                                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      addTaskToCategory(realIndex, taskInputs[realIndex]);
                                    }
                                  }}
                                />
                                <button
                                  className={styles.addBtn}
                                  onClick={() => {
                                    addTaskToCategory(realIndex, taskInputs[realIndex]);
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
            .filter(Boolean)}
        </SortableContext>

        {/* ドラッグ中のオーバーレイ表示 */}
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
  );
}
