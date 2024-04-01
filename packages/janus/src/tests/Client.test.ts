import Client from "../Client";
import Server from "jest-websocket-mock";
import { PROD_HOST } from "../constants";
import JanusClient from "../Client";

describe("JanusClient", () => {
  const server = new Server(PROD_HOST, { jsonProtocol: true });
  it("Creates an instance with the correct parameters", () => {
    const instance = new Client({
      login: "test",
      password: "test",
    });
    expect(instance).toBeTruthy();
  });

  describe("SIP Registration", () => {
    it("Sends registration request with the correct parameters", async () => {
      const mockOnReady = jest.fn();
      const client = new JanusClient({
        login: "login",
        password: "password",
      });

      client.on("telnyx.ready", mockOnReady);

      // 1. Create Session
      client.connect();
      await server.connected;
      await expect(server).toReceiveMessage(
        expect.objectContaining({ janus: "create" })
      );

      server.send({
        janus: "success",
        data: { id: 123 },
        transaction: "mocked-uuid",
      });

      // 2. Attach SIP Plugin to session

      await expect(server).toReceiveMessage(
        expect.objectContaining({
          janus: "attach",
          plugin: "janus.plugin.sip",
          session_id: 123,
        })
      );

      server.send({
        janus: "success",
        data: { id: 123 },
        transaction: "mocked-uuid",
      });

      // 3. Register SIP Agent
      await expect(server).toReceiveMessage(
        expect.objectContaining({
          janus: "message",
          body: expect.objectContaining({
            request: "register",
            authuser: "login",
          }),
        })
      );

      server.send({
        janus: "event",
        transaction: "mocked-uuid",
        plugindata: {
          data: {
            result: {
              event: "registering",
            },
          },
        },
      });

      server.send({
        janus: "event",
        plugindata: {
          data: {
            result: {
              event: "registered",
            },
          },
        },
      });

      await expect(mockOnReady).toHaveBeenCalled();
    });
  });
});
