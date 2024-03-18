import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import Button from 'react-bootstrap/Button';
import { sareeImage } from '../constants';
import { useState } from "react";
import Accordion from 'react-bootstrap/Accordion';

interface Props {
  baseURL: string;
}
const ImageToImageShowcase: React.FC<Props> = ({ baseURL }) => {
  const [genStatus, setGenStatus] = useState<string>()
  const [spinner, setSpinner] = useState<boolean>(false)
  const [base64Image, setBase64Image] = useState<any>(sareeImage);
  const [results, setResults] = useState<any>([]);

  function search() {
    setGenStatus('')
    setSpinner(true)
    const payload = base64Image.substring(base64Image.indexOf(",") + 1, base64Image.length)
    fetch(
      baseURL + "search/image",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageInput: payload }),
      }
    )
      .then((res) => res.json())
      .then((data) => {
        setSpinner(false)
        setGenStatus('')
        const topThreeHits = data.hits.slice(0, 3)
        setResults(topThreeHits)
      })
      .catch((err) => {
        setSpinner(false)
        setGenStatus('Error: Please check your API URL, browser console, WAF configuration, Bedrock model access, and Lambda logs for debugging the error.')
      });
  }

  function pickProduct(e: any) {
    let file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBase64Image(reader.result)
        setResults([])
      }
      reader.readAsDataURL(file)
    }
  }
  function openBrowse() {
    document.getElementById('file')?.click();
  }

  return (
    <Container>
      <Row>
        <Col><p>{spinner ? 'Finding Products...' : genStatus}</p></Col>
      </Row>
      <Row>
        <Col>
          <Card className='Card-display'>
            <Card.Header>Search</Card.Header>
            <Card.Header>
              <Button size="sm" onClick={search}>Find Similar Product</Button>
              <Accordion className='Change-product' flush>
                <Accordion.Item eventKey="0">
                  <Accordion.Header id='browse'>Change Product</Accordion.Header>
                  <Accordion.Body>
                  <input type="file" name="avatar" id="file" accept=".jpeg, .png, .jpg" onChange={pickProduct} style={{display: 'none'}} />
                  <input type="button" value="Browse..." onClick={openBrowse} />
                  </Accordion.Body>
                </Accordion.Item>
              </Accordion>
            </Card.Header>
            <Card.Img src={base64Image} />
          </Card>
        </Col>
        {
          results.map((result: {
            _id: string; _source: any
          }, index: number) => (
            <Col key={result._id}>
              <Card className='Card-display'>
                <Card.Header>Result #{index + 1}</Card.Header>
                <Card.Header className='card-title'>{result._source.image_product_description}</Card.Header>
                <Card.Img src={result._source.image_path} />
              </Card>
            </Col>
          ))}
      </Row>
    </Container>
  );
};



export default ImageToImageShowcase;
