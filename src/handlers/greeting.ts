export function handleHello(socket: any) {
  const greeting = {
    svID: "Example EPP server epp.example.com",
    svDate: new Date().toISOString(),
    versions: ["1.0"],
    langs: ["en"],
    objURIs: [
      "urn:ietf:params:xml:ns:domain-1.0",
      "urn:ietf:params:xml:ns:contact-1.0",
      "urn:ietf:params:xml:ns:host-1.0"
    ]
  };

  socket.write(`<?xml version="1.0" encoding="UTF-8" standalone="no"?>
  <epp xmlns="urn:ietf:params:xml:ns:epp-1.0">
    <greeting>
      <svID>${greeting.svID}</svID>
      <svDate>${greeting.svDate}</svDate>
      <svcMenu>
        ${greeting.versions.map(v => `<version>${v}</version>`).join("")}
        ${greeting.langs.map(l => `<lang>${l}</lang>`).join("")}
        ${greeting.objURIs.map(uri => `<objURI>${uri}</objURI>`).join("")}
      </svcMenu>
    </greeting>
  </epp>`);
}
