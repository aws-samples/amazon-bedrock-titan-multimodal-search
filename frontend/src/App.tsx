import './App.css';
import Container from 'react-bootstrap/Container';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import ImageToImageShowcase from './components/image-to-image';
import TextToImageShowcase from './components/text-to-image';
import { useState } from "react";

function App() {
  const [baseUrl,setBaseUrl] = useState<string>('')
  return (
    <Container className="mt-5">
      <Container className="p-10 mb-4 bg-light rounded-3">
        <h5 className="header">
          Product Search using <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/titan-multiemb-models.html" target="_blank">Amazon Titan Multimodal Embeddings model</a>
        </h5>
        <strong>Enter API URL</strong>
        <input type="text" id="urlinput" style={{width: "100%"}} placeholder="https://example.execute-api.example.amazonaws.com/example/" 
              onChange={(e) => {
                setBaseUrl(e.target?.value)
              }}
        />
      </Container>
      <Tabs defaultActiveKey="profile" id="uncontrolled-tab-example" className="mb-3">
        <Tab eventKey="img-to-img" title="Image Search">
          <ImageToImageShowcase baseURL={baseUrl}/>
        </Tab>
        <Tab eventKey="txt-to-img" title="Text Search">
          <TextToImageShowcase baseURL={baseUrl}/>
        </Tab>
      </Tabs>
    </Container>    
  );
}

export default App;
