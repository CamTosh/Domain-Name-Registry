import type { Domain } from "../types";

interface LoginSuccessData {
  sessionId: string;
}

interface CheckResponseData {
  domain: string;
  available: boolean;
}

interface CreateResponseData {
  name: string;
  created_at: number;
  expiry_date: number | null;
  sessionId: string;
}

interface InfoResponseData extends Domain {
  sessionId: string;
}

type ResponseTypes = {
  authError: never;
  checkResponse: CheckResponseData;
  createError: never;
  createSuccess: CreateResponseData;
  infoResponse: InfoResponseData;
  loginSuccess: LoginSuccessData;
  notFound: never;
  rateLimitExceeded: never;
  systemError: never;
  unknownCommand: never;
}

const addTransactionId = (sessionId?: string) => `
  <trID>
    ${sessionId ? `<clTRID>${sessionId}</clTRID>` : ''}
    <svTRID>${crypto.randomUUID()}</svTRID>
  </trID>
`;

// Response templates
const responses = {
  authError: () => `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <response>
    <result code="2200">
      <msg>Authentication error</msg>
    </result>
  </response>
</epp>`,

  checkResponse: (data: CheckResponseData) => `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <response>
    <result code="1000">
      <msg>Command completed successfully</msg>
    </result>
    <resData>
      <domain:chkData xmlns:domain="urn:ietf:params:xml:ns:domain-1.0">
        <domain:cd>
          <domain:name avail="${data.available ? '1' : '0'}">${data.domain}</domain:name>
          ${!data.available ? '<domain:reason>In use</domain:reason>' : ''}
        </domain:cd>
      </domain:chkData>
    </resData>
    ${addTransactionId(data.sessionId)}
  </response>
</epp>`,


  createError: () => `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <response>
    <result code="2302">
      <msg>Object exists</msg>
    </result>
  </response>
</epp>`,

  createSuccess: (data: Domain) => `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <response>
    <result code="1000">
      <msg>Command completed successfully</msg>
    </result>
    <resData>
      <domain:creData xmlns:domain="urn:ietf:params:xml:ns:domain-1.0">
        <domain:name>${data.name}</domain:name>
        <domain:crDate>${data.created_at}</domain:crDate>
        <domain:exDate>${data.expiry_date}</domain:exDate>
      </domain:creData>
    </resData>
    <trID>
      <svTRID>${crypto.randomUUID()}</svTRID>
    </trID>
  </response>
</epp>`,

  infoResponse: (data: Domain) => `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <response>
    <result code="1000">
      <msg>Command completed successfully</msg>
    </result>
    <resData>
      <domain:infData xmlns:domain="urn:ietf:params:xml:ns:domain-1.0">
        <domain:name>${data.name}</domain:name>
        <domain:status s="${data.status}"/>
        <domain:registrant>${data.registrar}</domain:registrant>
        <domain:crDate>${data.created_at}</domain:crDate>
        ${data.updated_at ? `<domain:upDate>${data.updated_at}</domain:upDate>` : ''}
        <domain:exDate>${data.expiry_date}</domain:exDate>
      </domain:infData>
    </resData>
    <trID>
      <svTRID>${crypto.randomUUID()}</svTRID>
    </trID>
  </response>
</epp>`,

  loginSuccess: (data: LoginSuccessData) => `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <response>
    <result code="1000">
      <msg>Command completed successfully</msg>
    </result>
    <trID>
      <svTRID>${data.sessionId}</svTRID>
    </trID>
  </response>
</epp>`,

  notFound: () => `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <response>
    <result code="2303">
      <msg>Object does not exist</msg>
    </result>
  </response>
</epp>`,

  rateLimitExceeded: () => `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <response>
    <result code="2308">
      <msg>Rate limit exceeded</msg>
    </result>
  </response>
</epp>`,

  systemError: () => `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <response>
    <result code="2400">
      <msg>Command failed</msg>
    </result>
  </response>
</epp>`,

  unknownCommand: () => `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
  <response>
    <result code="2000">
      <msg>Unknown command</msg>
    </result>
  </response>
</epp>`,
} as const;

export function generateResponse<T extends keyof ResponseTypes>(
  type: T,
  data?: ResponseTypes[T]
): string {
  const response = responses[type];
  return response(data as any);
}
