const responses = {
  loginSuccess: (data: any) => `
    <?xml version="1.0" encoding="UTF-8"?>
    <epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
      <response>
        <result code="1000">
          <msg>Login successful</msg>
        </result>
        <trID>${data.sessionId}</trID>
      </response>
    </epp>
  `,

  checkResponse: (data: any) => `
    <?xml version="1.0" encoding="UTF-8"?>
    <epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
      <response>
        <result code="1000">
          <msg>Command completed successfully</msg>
        </result>
        <resData>
          <domain:chkData>
            <domain:cd>
              <domain:name avail="${data.available ? '1' : '0'}">${data.domain}</domain:name>
            </domain:cd>
          </domain:chkData>
        </resData>
      </response>
    </epp>
  `,

  // Add other response templates
};

export function generateResponse(type: string, data: any = {}) {
  return responses[type]?.(data) ||
    `<?xml version="1.0" encoding="UTF-8"?><epp><response><result code="2400"><msg>Command failed</msg></result></response></epp>`;
}
