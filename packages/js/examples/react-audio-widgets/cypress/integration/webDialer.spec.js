/* eslint-disable no-unused-expressions */
/* eslint-disable no-undef */
describe('Webialer', () => {
  beforeEach(() => {
    cy.visit('/iframe.html?id=audio--web-dialer', { responseTimeout: 60000 });
    cy.window().should('have.property', 'appReady', true);
  });

  it('should make a call and hang up a call', () => {
    cy.window()
      .its('storyData')
      .should((storyData) => {
        // the story must expose some variables
        expect(storyData).to.not.null;
        expect(storyData.username).to.equal(Cypress.env('username'));
        expect(storyData.password).to.equal(Cypress.env('password'));
        expect(storyData.defaultDestination).to.equal(
          Cypress.env('destination')
        );
      })
      .then(() => {
        // the test code
        cy.get('[data-testid=webdialer]').click();
        cy.get('[data-testid=input-destination]').clear();
        cy.get('[data-testid=input-destination]').type(Cypress.env('destination'));
        cy.get('[data-testid=btn-call]').click();
        cy.get('[data-testid=state-call-new]').should('exist');
        cy.get('[data-testid=state-call-requesting]').should('exist');
        cy.get('[data-testid=state-call-active]').should('exist');
        cy.get('[data-testid=btn-end-call]').click();
      });
  });
});
