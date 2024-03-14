import Container from 'react-bootstrap/Container';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Card from 'react-bootstrap/Card';
import { useState } from "react";

interface Props{
    baseURL: string;
}
const TextToImageShowcase: React.FC<Props> = ({baseURL}) => {
  const [genStatus,setGenStatus] = useState<string>()
  const [spinner, setSpinner] = useState<boolean>(false)  
  const [results, setResults] = useState<any>([]);

  function search(e:any){
        if (e.key === "Enter") {
            setGenStatus('')        
            setSpinner(true)   
            fetch(
            baseURL + "search/text",
            {
                method: "POST",
                headers: {
                "Content-Type": "application/json",
                },
                body: JSON.stringify({ textInput: e.target?.value}),
            }
            )
            .then((res) => res.json())
            .then((data) => {             
                setSpinner(false)
                setGenStatus('')         
                const topThreeHits = data.hits.slice(0,4)
                setResults(topThreeHits)
            })  
            .catch((err) => {
                setSpinner(false)
                setGenStatus('Error: Please check your API URL, browser console, WAF configuration, Bedrock model access, and Lambda logs for debugging the error.')  
            });  
        }
    }

  return (
    <Container>
        <Row>
            <Col><p>{spinner?'Finding Products...':genStatus}</p></Col>
        </Row>  
        <Row>
            <Container className="p-10 mb-4 rounded-3">
                <input type="text" id="txt" style={{width: "90%"}} placeholder="Describe the product you are looking for and press enter..."  onKeyDown={search} />
            </Container>
        </Row>        
        <Row>
        {            
        results.map((result :{
            _id: string; _source:any}, index:number) => (                       
            <Col key={result._id}>        
                <Card style={{ width: '18rem' }} >
                    <Card.Header>Result #{index+1}</Card.Header>
                    <Card.Header>{result._source.image_product_description}</Card.Header>
                    <Card.Img src={result._source.image_path} />
                </Card>
            </Col>
        ))}        
        </Row>
    </Container>
  );
};

export default TextToImageShowcase;
