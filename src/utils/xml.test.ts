import { expect, test, describe } from "bun:test";
import { parseXml } from "../../src/utils/xml";

describe("XML Parser", () => {
  test("should parse login command", () => {
    const xml = `
      <epp>
        <command>
          <login>
            <clID>test1</clID>
            <pw>test1</pw>
          </login>
        </command>
      </epp>
    `;

    const result = parseXml(xml);
    expect(result.type).toBe("login");
    expect(result).toEqual({
      type: "login",
      id: "test1",
      pw: "test1"
    });
  });

  test("should throw on invalid command", () => {
    const xml = "<epp><invalid></invalid></epp>";
    expect(() => parseXml(xml)).toThrow();
  });


  test("should extract session ID from command", () => {
    const xml = `
        <epp>
          <command>
            <check>
              <domain:name>example.com</domain:name>
            </check>
            <clTRID>ABC-12345</clTRID>
          </command>
        </epp>
      `;

    const result = parseXml(xml);
    expect(result.sessionId).toBe("ABC-12345");
  });

  test("should handle missing session ID", () => {
    const xml = `
        <epp>
          <command>
            <check>
              <domain:name>example.com</domain:name>
            </check>
          </command>
        </epp>
      `;

    const result = parseXml(xml);
    expect(result.sessionId).toBeUndefined();
  });
});
