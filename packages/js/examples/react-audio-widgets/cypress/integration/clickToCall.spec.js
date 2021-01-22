describe('ClickToCall', () => {
  it('should open storybook', () => {
    cy.visit('/iframe.html?id=audio--click-to-call');
  });
  it('should click on button call', () => {
    cy.get('[data-testid=btn-call]').click();
  })
});