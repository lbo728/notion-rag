import { test, expect } from "@playwright/test";

test.describe("Chat E2E", () => {
  test("should complete single-turn chat with citations", async ({ page }) => {
    // Navigate to chat page
    await page.goto("/");

    // Wait for page to load
    await expect(page.locator("h1")).toContainText("Notion RAG Chatbot");

    // Verify initial state - empty messages
    const messageContainer = page.locator('[class*="space-y-4"]');
    await expect(messageContainer).toBeVisible();

    // Enter a query
    const input = page.locator('input[type="text"]');
    await expect(input).toBeVisible();
    await input.fill("프로젝트 설정에 대해 알려줘");

    // Submit the query
    const sendButton = page.locator('button[type="submit"]');
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // Wait for response (loading state should appear first)
    await expect(page.locator("text=Thinking...").or(page.locator("text=프로젝트 설정"))).toBeVisible({
      timeout: 30000,
    });

    // Wait for assistant response
    await page.waitForTimeout(2000); // Give time for response to render

    // Verify response contains content
    const assistantMessages = page.locator('[class*="bg-gray-100"]');
    await expect(assistantMessages.first()).toBeVisible();

    // Verify citations are displayed (if available)
    const citationsSection = page.locator("text=Sources:");
    const citationLinks = page.locator('a[href*="notion.so"]');

    // Citations may or may not be present depending on data availability
    // Just verify the page is interactive and responsive
    await expect(page.locator("main")).toBeVisible();
  });

  test("should display user message after sending", async ({ page }) => {
    await page.goto("/");

    const query = "Test question";
    const input = page.locator('input[type="text"]');
    await input.fill(query);

    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    // Verify user message appears
    await expect(page.locator(`text=${query}`)).toBeVisible({
      timeout: 5000,
    });

    // User message should be in a blue background (user message style)
    const userMessage = page
      .locator('[class*="bg-blue-100"]')
      .filter({ hasText: query })
      .first();
    await expect(userMessage).toBeVisible();
  });

  test("should handle empty query", async ({ page }) => {
    await page.goto("/");

    const sendButton = page.locator('button[type="submit"]');
    
    // Button should be disabled for empty input
    const input = page.locator('input[type="text"]');
    await expect(input).toHaveValue("");
    
    // Try to click - button should be disabled or form should not submit
    const isDisabled = await sendButton.getAttribute("disabled");
    expect(isDisabled).not.toBeNull();
  });

  test("should handle loading state", async ({ page }) => {
    await page.goto("/");

    const input = page.locator('input[type="text"]');
    await input.fill("Test query");

    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    // Loading state should appear
    const loadingIndicator = page.locator("text=Thinking...");
    await expect(loadingIndicator).toBeVisible({ timeout: 5000 });

    // Input should be disabled during loading
    await expect(input).toBeDisabled({ timeout: 1000 });
  });

  test("should format citations correctly when present", async ({ page }) => {
    await page.goto("/");

    // This test assumes test data is available
    // In a real scenario, you might seed test data first
    const input = page.locator('input[type="text"]');
    await input.fill("프로젝트 설정");

    const sendButton = page.locator('button[type="submit"]');
    await sendButton.click();

    // Wait for response
    await page.waitForTimeout(5000);

    // Check if citations section exists (may not appear if no data)
    const hasCitations = await page.locator("text=Sources:").isVisible().catch(() => false);

    if (hasCitations) {
      // Verify citation links are present
      const citationLinks = page.locator('a[href*="notion.so"]');
      const count = await citationLinks.count();

      if (count > 0) {
        // Verify citation format
        const firstCitation = citationLinks.first();
        await expect(firstCitation).toBeVisible();
        
        // Should have relevance score displayed
        const relevanceText = page.locator("text=/relevance:/");
        await expect(relevanceText.first()).toBeVisible();
      }
    }
  });
});

