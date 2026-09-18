import { test, expect } from '@playwright/test';

test('Load the home page', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Overwatch Community Tournament')).toBeVisible();
})

test('Load the tournament schedule page', async ({ page }) => {
    await page.goto('/tournament/schedule');
    await expect(page.getByText('Registration Opens')).toBeVisible();
    await expect(page.locator('tournament-nav-tabs a[data-tab="schedule"]')).toHaveClass(/border-gold/);
})

test('Load the tournament teams page', async ({ page }) => {
    await page.goto('/tournament/teams');
    const bracketToggleState = await page.getByRole('link', { name: /^Emerald/ }).getAttribute('class');
    const activeBracket = bracketToggleState?.includes('bg-gold') ? 'emerald' : 'diamond';
    const teamsTab = page.locator('#tournament-nav-tabs a[data-tab="teams"]');
    await expect(teamsTab).toHaveClass(/border-gold/);
    await expect(teamsTab).toHaveAttribute('href', `/tournament/teams/${activeBracket}`);
})

test('Load the tournament matchups page', async ({ page }) => {
    await page.goto('/tournament/matchups');
    const bracketToggleState = await page.getByRole('link', { name: /^Emerald/ }).getAttribute('class');
    const activeBracket = bracketToggleState?.includes('bg-gold') ? 'emerald' : 'diamond';
    const matchupsTab = page.locator('#tournament-nav-tabs a[data-tab="matchups"]');
    await expect(matchupsTab).toHaveClass(/border-gold/);
    await expect(matchupsTab).toHaveAttribute('href', `/tournament/matchups/${activeBracket}`);
})

test('Load the tournament standings page', async ({ page }) => {
    await page.goto('/tournament/standings');
    const bracketToggleState = await page.getByRole('link', { name: /^Emerald/ }).getAttribute('class');
    const activeBracket = bracketToggleState?.includes('bg-gold') ? 'emerald' : 'diamond';
    const standingsTab = page.locator('#tournament-nav-tabs a[data-tab="standings"]');
    await expect(standingsTab).toHaveClass(/border-gold/);
    await expect(standingsTab).toHaveAttribute('href', `/tournament/standings/${activeBracket}`);
})

test('Load the tournament playoffs page', async ({ page }) => {
    await page.goto('/tournament/playoffs');
    const bracketToggleState = await page.getByRole('link', { name: /^Emerald/ }).getAttribute('class');
    const activeBracket = bracketToggleState?.includes('bg-gold') ? 'emerald' : 'diamond';
    const playoffsTab = page.locator('#tournament-nav-tabs a[data-tab="playoffs"]');
    await expect(playoffsTab).toHaveClass(/border-gold/);
    await expect(playoffsTab).toHaveAttribute('href', `/tournament/playoffs/${activeBracket}`);
})

test('Load the rulebook page', async ({ page }) => {
    await page.goto('/rulebook');
    await expect(page.locator('main h1')).toHaveText('Rulebook');
})

test('Load the Hall of Fame page', async ({ page }) => {
    await page.goto('/hall-of-fame');
    await expect(page.locator('main h1')).toHaveText('Hall of Fame');
    // TODO: Add assertion for default tab within hall of fame
})

test('Load the About page', async ({ page }) => {
    await page.goto('/about');
    await expect(page.locator('main h1')).toHaveText('WHAT IS LFGS?');
})