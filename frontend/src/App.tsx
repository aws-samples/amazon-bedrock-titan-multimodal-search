import './App.css';
import Container from 'react-bootstrap/Container';
import Tab from 'react-bootstrap/Tab';
import Tabs from 'react-bootstrap/Tabs';
import ImagePlusTextToImageShowcase from './components/img-plus-text-to-image';
import { useState } from "react";

function App() {
  const [baseUrl,setBaseUrl] = useState<string>(process.env.REACT_APP_API_URL ?? '');
  return (
    <Container className="mt-5">
      <Container className="p-10 mb-4 bg-light rounded-3">
        <h5 className="header">
          Product Search using <a href="https://docs.aws.amazon.com/bedrock/latest/userguide/titan-multiemb-models.html" target="_blank">Amazon Titan Multimodal Embeddings model</a>
        </h5>
        <strong>API URL:</strong>
        <input type="text" id="urlinput" style={{width: "100%"}} placeholder="https://example.execute-api.example.amazonaws.com/example/" 
        value={baseUrl}
             onChange={(e) => {
              setBaseUrl(e.target?.value)
            }}
        />
      </Container>
      <ImagePlusTextToImageShowcase baseURL={baseUrl}/>
    </Container>    
  );
}

export default App;
