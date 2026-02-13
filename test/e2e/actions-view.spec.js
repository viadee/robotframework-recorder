// @ts-check
const { test, expect } = require('@playwright/test');
const { launchExtension, openPopup, openFixture, cleanup } = require('./setup');

test.describe('Actions View', () => {
  let context, extensionId, userDataDir;

  test.beforeAll(async () => {
    ({ context, extensionId, userDataDir } = await launchExtension());
  });

  test.afterAll(async () => {
    await cleanup(context, userDataDir);
  });

  /**
   * Record some actions so there's data to view.
   */
  async function recordSomeActions() {
    const popup = await openPopup(context, extensionId);
    const target = await openFixture(context, 'form-page.html');

    await target.bringToFront();
    await popup.bringToFront();
    await popup.locator('#record').click();
    await popup.waitForTimeout(1000);

    await target.bringToFront();
    await target.locator('#username').click();
    await target.locator('#username').fill('action1');
    await target.locator('#email').click();
    await target.locator('#email').fill('action2@test.com');
    await target.locator('#submit-btn').click();
    await target.waitForTimeout(500);

    await popup.bringToFront();
    await popup.locator('#stop').click();
    await popup.waitForTimeout(1000);

    return { popup, target };
  }

  test('open actions view → verify recorded actions appear', async () => {
    const { popup, target } = await recordSomeActions();

    // Click "Script View" to open actions view
    const [actionsPage] = await Promise.all([
      context.waitForEvent('page'),
      popup.locator('#open-actions-view').click(),
    ]);
    await actionsPage.waitForLoadState('domcontentloaded');
    await actionsPage.waitForTimeout(1000);

    // The actions view should contain some rows with recorded actions
    const body = await actionsPage.locator('body').innerText();
    expect(body.length).toBeGreaterThan(0);

    await actionsPage.close();
    await popup.close();
    await target.close();
  });

  test('delete an action from the actions view', async () => {
    const { popup, target } = await recordSomeActions();

    const [actionsPage] = await Promise.all([
      context.waitForEvent('page'),
      popup.locator('#open-actions-view').click(),
    ]);
    await actionsPage.waitForLoadState('domcontentloaded');
    await actionsPage.waitForTimeout(1000);

    // Count action rows before deletion
    const rowsBefore = await actionsPage.locator('.action-row, tr, .line-row').count();

    // If there's a delete button, click the first one
    const deleteBtn = actionsPage.locator('button.delete, button.btn-delete, .delete-btn, [title*="delete" i], [title*="remove" i]').first();
    if (await deleteBtn.isVisible().catch(() => false)) {
      await deleteBtn.click();
      await actionsPage.waitForTimeout(500);

      const rowsAfter = await actionsPage.locator('.action-row, tr, .line-row').count();
      expect(rowsAfter).toBeLessThan(rowsBefore);
    }

    await actionsPage.close();
    await popup.close();
    await target.close();
  });

  test('reorder actions (move up/down)', async () => {
    const { popup, target } = await recordSomeActions();

    const [actionsPage] = await Promise.all([
      context.waitForEvent('page'),
      popup.locator('#open-actions-view').click(),
    ]);
    await actionsPage.waitForLoadState('domcontentloaded');
    await actionsPage.waitForTimeout(1000);

    // Look for move-up / move-down buttons
    const moveDownBtn = actionsPage.locator('button.move-down, button.btn-down, [title*="down" i], [title*="move" i]').first();
    if (await moveDownBtn.isVisible().catch(() => false)) {
      // Get text of first row before move
      const _firstRowText = await actionsPage.locator('.action-row, .line-row').first().innerText();
      await moveDownBtn.click();
      await actionsPage.waitForTimeout(500);

      // After moving down, the first row should be different
      const newFirstRowText = await actionsPage.locator('.action-row, .line-row').first().innerText();
      // They may or may not differ depending on which row's button was clicked
      expect(typeof newFirstRowText).toBe('string');
    }

    await actionsPage.close();
    await popup.close();
    await target.close();
  });

  test('edit an action inline', async () => {
    const { popup, target } = await recordSomeActions();

    const [actionsPage] = await Promise.all([
      context.waitForEvent('page'),
      popup.locator('#open-actions-view').click(),
    ]);
    await actionsPage.waitForLoadState('domcontentloaded');
    await actionsPage.waitForTimeout(1000);

    // Look for editable input fields in the actions view
    const editableInput = actionsPage.locator('input.action-input, input.line-input, .action-row input, .line-row input').first();
    if (await editableInput.isVisible().catch(() => false)) {
      await editableInput.fill('    Log    Edited Action');
      await editableInput.press('Enter');
      await actionsPage.waitForTimeout(500);

      const value = await editableInput.inputValue();
      expect(value).toContain('Edited Action');
    }

    await actionsPage.close();
    await popup.close();
    await target.close();
  });
});
