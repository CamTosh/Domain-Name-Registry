export class MockSocket {
  public writtenData: string[] = [];
  public remoteAddress = "127.0.0.1";

  end() { }

  write(data: string) {
    this.writtenData.push(data);
  }

  getResponse() {
    return this.writtenData.join("");
  }

  getLastResponse() {
    return this.writtenData[this.writtenData.length - 1];
  }
}
