"use client";
import { Box, Button, Stack, TextField, Modal, Typography } from "@mui/material";
import { useState } from "react";

export default function Home() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [professorUrl, setProfessorUrl] = useState('')

  const handleClose = ()=>{
    setOpen(false)
  }
  const handleOpen = ()=>{
    setOpen(true)
  }

  const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
  };

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hi! I'm the Rate My Professor support assistant. How can I help you today?`,
    },
  ]);
  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    setMessage("");
    setMessages((messages) => [
      ...messages,
      { role: "user", content: message },
      { role: "assistant", content: "" },
    ]);

    const response = fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify([...messages, { role: "user", content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = "";

      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), {
          stream: true,
        });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
        return reader.read().then(processText);
      });
    });
  };

  const handleSubmit = async ()=>{
    //e.preventDefault();
   
    try {
        const response = fetch("/api/scrape", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([professorUrl]),
        })/* .then( async (res)=>{
          const data = await res.body.json()
          return data;
        }); */

        const data = await response.body;
        alert("successfully added professor link")
        setOpen(false)
        /* setMessage(data);
        sendMessage */
        

    } catch (error) {
        console.error('Error:', error);
        console.log('An error occurred while processing your request.');
    } finally {
        setLoading(false);
    }
  }

  return (
    <main>
      <Box
        minHeight="100vh"
        display="flex"
        flexDirection="column"
        justifyContent="center"
        alignItems="center"
        padding={2}
      >
        <Stack
          direction={"column"}
          width="500px"
          height="700px"
          border="1px solid black"
          py={2}
          spacing={3}
        >
          <Stack
            direction={"column"}
            spacing={2}
            flexGrow={1}
            overflow="auto"
            maxHeight="100%"
            px={2}
          >
            {messages.map((message, index) => (
              <Box
                key={index}
                display="flex"
                justifyContent={
                  message.role === "assistant" ? "flex-start" : "flex-end"
                }
              >
                <Box
                  bgcolor={
                    message.role === "assistant"
                      ? "primary.main"
                      : "secondary.main"
                  }
                  color="white"
                  borderRadius={16}
                  p={3}
                >
                  {message.content}
                </Box>
              </Box>
            ))}
          </Stack>
          <Stack direction={"row"} spacing={2} px={2}>
          <Button variant="contained" onClick={handleOpen}>
              Add Link
          </Button>
          <Modal
          open={open}
          onClose={handleClose}
          aria-labelledby="modal-modal-title"
          aria-describedby="modal-modal-description"
          >
            <Box sx={style} width="400px" backgroundColor="white" alignSelf="center">
              <Typography id="modal-modal-title" variant="h6" component="h2">
                Enter the URL to the page
              </Typography>
              <TextField value={professorUrl} label="Enter link" variant="outlined" onChange={(e) => setProfessorUrl(e.target.value)}>Enter link</TextField>
              <Button variant="contained" onClick={handleSubmit} >Get Rating</Button>
            </Box>
          </Modal>

            <TextField
              label="Message"
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <Button variant="contained" onClick={sendMessage}>
              Send
            </Button>

          </Stack>
        </Stack>
      </Box>
    </main>
  );
}

