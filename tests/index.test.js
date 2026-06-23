const axios2 = require("axios");

const BACKEND_URL = "http://localhost:3000";
const WS_URL = "wss://localhost:3001";

const axios = {
  post: async (...args) => {
    try {
      const res = await axios2.post(...args);
      return { ...res, statusCode: res.status };
    } catch (e) {
      return { ...e.response, statusCode: e.response?.status };
    }
  },
  get: async (...args) => {
    try {
      const res = await axios2.get(...args);
      return { ...res, statusCode: res.status };
    } catch (e) {
      return { ...e.response, statusCode: e.response?.status };
    }
  },
  put: async (...args) => {
    try {
      const res = await axios2.put(...args);
      return { ...res, statusCode: res.status };
    } catch (e) {
      return { ...e.response, statusCode: e.response?.status };
    }
  },
  delete: async (...args) => {
    try {
      const res = await axios2.delete(...args);
      return { ...res, statusCode: res.status };
    } catch (e) {
      return { ...e.response, statusCode: e.response?.status };
    }
  },
};

describe("Authentication", () => {
  test("User is able to sign up only once", async () => {
    const username = "Gaurav" + Math.random(); // Gaurav0.12333445
    const password = "123456";
    const response = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
      username,
      password,
      type: "admin",
    });

    expect(response.statusCode).toBe(200);
    const updatedResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
      username,
      password,
      type: "admin",
    });

    expect(updatedResponse.statusCode).toBe(400);
  });

  test("Signup fails if the usernae is empty", async () => {
    const username = `Gaurav-${Math.random()}`; //Gaurav-0.1231323
    const password = "123456";

    const response = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
      password,
    });

    expect(response.statusCode).toBe(400);
  });

  test("Signin succeeds if the username and password are correct", async () => {
    const username = `Gaurav-${Math.random()}`; //Gaurav-0.1231323
    const password = "123456";

    const response = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
      username,
      password,
      type: "admin",
    });
    expect(response.statusCode).toBe(200);

    const responce = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
      username,
      password,
    });

    expect(responce.statusCode).toBe(200);
    expect(responce.data.token).toBeDefined();
  });

  test("Siging fails if the username and password are incorrect", async () => {
    const username = `Gaurav-${Math.random()}`; //Gaurav-0.1231323
    const password = "123456";

    await axios.post(`${BACKEND_URL}/api/v1/signup`, {
      username,
      password,
    });

    const response = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
      username: "wrongUsername",
      password,
    });
    expect(response.statusCode).toBe(403);
  });
});

describe("User metadata endpoint", () => {
  let token = "";
  let avatarId = "";
  beforeAll(async () => {
    const username = `Gaurav-${Math.random()}`;
    const password = "123456";
    await axios.post(`${BACKEND_URL}/api/v1/signup`, {
      username,
      password,
      type: "admin",
    });
    const response = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
      username,
      password,
    });

    token = response.data.token;

    const avatarResponse = await axios.post(
      `${BACKEND_URL}/api/v1/admin/avatar`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
        name: "Timmy",
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );

    avatarId = avatarResponse.data.id;
  });

  test("User cant update their metadata with a wrong avatar id", async () => {
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/user/metadata`,
      {
        avatarId: "12312323",
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );
    expect(response.statusCode).toBe(403);
  });

  test("User can update their metadata with a right avatar id", async () => {
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/user/metadata`,
      {
        avatarId: avatarId,
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );
    expect(response.statusCode).toBe(200);
  });

  test("User is not able to update their metadata if the auth header is not present", async () => {
    const response = await axios.post(`${BACKEND_URL}/api/v1/user/metadata`, {
      avatarId: avatarId,
    });
    expect(response.statusCode).toBe(403);
  });
});

describe("User avatar information", () => {
  let avatarId;
  let token;
  let userId;
  beforeAll(async () => {
    const username = `Gaurav-${Math.random()}`;
    const password = "123456";
    const singupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
      username,
      password,
      type: "admin",
    });

    userId = singupResponse.data.userId;

    const response = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
      username,
      password,
    });
    token = response.data.token;

    const avatarResponse = await axios.post(
      `${BACKEND_URL}/api/v1/admin/avatar`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
        name: "Timmy",
      },
      {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    );
    avatarId = avatarResponse.data.id;
  });

  test("Get back avatar information for a user", async () => {
    const response = await axios.get(
      `${BACKEND_URL}/api/v1/user/metadata/bulk?ids=[${userId}]`,
    );

    expect(response.data.avatars.length).toBe(1);
    expect(response.data.avatars[0].userId).toBe(userId);
  });

  test("Available avatars list the recently created avatar", async () => {
    const response = await axios.get(`${BACKEND_URL}/api/v1/avatars`);
    expect(response.data.avatars.length).not.toBe(0);
    const currentAvatar = response.data.avatars.find((x) => x.id == avatarId);
    expect(currentAvatar).toBeDefined();
  });
});

describe("Space information", () => {
  let mapId;
  let element1Id;
  let element2Id;
  let adminToken;
  let adminId;
  let userToken;
  let userId;
  beforeAll(async () => {
    const username = `Gaurav-${Math.random()}`;
    const password = "123456";
    const singupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
      username,
      password,
      type: "admin",
    });
    adminId = singupResponse.data.userId;


    const response = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
      username,
      password,
    });

    adminToken = response.data.token;

    const UsersingupResponse = await axios.post(
      `${BACKEND_URL}/api/v1/signup`,
      {
        username: username + "-user",
        password,
        type: "user",
      },
    );
    userId = UsersingupResponse.data.userId;

    const Userresponse = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
      username: username + "-user",
      password,
    });

    userToken = Userresponse.data.token;

    const element1Responce = await axios.post(
      `${BACKEND_URL}/api/v1/admin/element`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
        width: 1,
        height: 1,
        static: true,
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    const element2Response = await axios.post(
      `${BACKEND_URL}/api/v1/admin/element`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
        width: 1,
        height: 1,
        static: true,
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    element1Id = element1Responce.data.id;
    element2Id = element2Response.data.id;


    const map = await axios.post(
      `${BACKEND_URL}/api/v1/admin/map`,
      {
        thumbnail: "https://thumbnail.com/a.png",
        dimensions: "100x200",
        name: "100 person interview room",
        defaultElements: [
          {
            elementId: element1Id,
            x: 20,
            y: 20,
          },
          {
            elementId: element1Id,
            x: 18,
            y: 20,
          },
          {
            elementId: element2Id,
            x: 19,
            y: 20,
          },
        ],
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    mapId = map.data.id;
  });

  test("User is able to create a space", async () => {
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/space`,
      {
        name: "Test",
        dimensions: "100x200",
        mapId: mapId,
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );


    expect(response.data.spaceId).toBeDefined();
  });

  test("User is able to create a space without mapId (empty space)", async () => {
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/space`,
      {
        name: "Test",
        dimensions: "100x200",
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    expect(response.data.spaceId).toBeDefined();
  });

  test("User is not able to create a space without mapId and dimesions", async () => {
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/space`,
      {
        name: "Test",
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    expect(response.statusCode).toBe(400);
  });

  test("User is not able to delete a space that doesnt exist", async () => {
    const response = await axios.delete(
      `${BACKEND_URL}/api/v1/space/ramdomIdDoestnotexist`,
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    expect(response.statusCode).toBe(400);
  });

  test("User is  able to delete a space that does exist", async () => {
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/space/`,
      {
        name: "Test",
        dimensions: "100x200",
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    const deleteResponse = await axios.delete(
      `${BACKEND_URL}/api/v1/space/${response.data.spaceId}`,
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    expect(deleteResponse.statusCode).toBe(200);
  });

  test("User should not be able to delete a space created by another user", async () => {
    const response = await axios.post(
      `${BACKEND_URL}/api/v1/space/`,
      {
        name: "Test",
        dimensions: "100x200",
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    const deleteResponse = await axios.delete(
      `${BACKEND_URL}/api/v1/space/${response.data.spaceId}`,

      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(deleteResponse.statusCode).toBe(403);
  });

  test("Admin has no space initially", async () => {
    const responce = await axios.get(`${BACKEND_URL}/api/v1/space/all`, {
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });
    expect(responce.data.spaces.length).toBe(0);
  });

  test("Admin can see their created space", async () => {
    const spaceCreateResponse = await axios.post(
      `${BACKEND_URL}/api/v1/space/`,
      {
        name: "Test",
        dimensions: "100x200",
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    const responce = await axios.get(`${BACKEND_URL}/api/v1/space/all`, {
      headers: {
        authorization: `Bearer ${adminToken}`,
      },
    });

    const filterdSpace = responce.data.spaces.find(
      (x) => x.id == spaceCreateResponse.data.spaceId,
    );

    expect(responce.data.spaces.length).toBe(1);
    expect(filterdSpace.id).toBeDefined();
  });
});

describe("Arena endpoints", () => {
  let mapId;
  let element1Id;
  let element2Id;
  let adminToken;
  let adminId;
  let userToken;
  let userId;
  let spaceId;
  beforeAll(async () => {
    const username = `Gaurav-${Math.random()}`;
    const password = "123456";
    const singupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
      username,
      password,
      type: "admin",
    });
    adminId = singupResponse.data.userId;
  
    

    const response = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
      username,
      password,
    });

    adminToken = response.data.token;

    const UsersingupResponse = await axios.post(
      `${BACKEND_URL}/api/v1/signup`,
      {
        username: username + "-user",
        password,
        type: "user",
      },
    );
    userId = UsersingupResponse.data.userId;

    const Userresponse = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
      username: username + "-user",
      password,
    });

    userToken = Userresponse.data.token;

    const element1Responce = await axios.post(
      `${BACKEND_URL}/api/v1/admin/element`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
        width: 1,
        height: 1,
        static: true,
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    const element2Response = await axios.post(
      `${BACKEND_URL}/api/v1/admin/element`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
        width: 1,
        height: 1,
        static: true,
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    element1Id = element1Responce.data.id;
    element2Id = element2Response.data.id;

    const map = await axios.post(
      `${BACKEND_URL}/api/v1/admin/map`,
      {
        thumbnail: "https://thumbnail.com/a.png",
        dimensions: "100x200",
        name: "100 person interview room",
        defaultElements: [
          {
            elementId: element1Id,
            x: 20,
            y: 20,
          },
          {
            elementId: element1Id,
            x: 18,
            y: 20,
          },
          {
            elementId: element2Id,
            x: 19,
            y: 20,
          },
        ],
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    mapId = map.data.id;

    const spaceResponce = await axios.post(
      `${BACKEND_URL}/api/v1/space`,
      {
        name: "Test",
        dimensions: "100x200",
        mapId: mapId,
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    spaceId = spaceResponce.data.spaceId;
  });

  test("Incorrect spaceId returns a 400", async () => {
    const response = await axios.get(`${BACKEND_URL}/api/v1/space/1223dkfjd`, {
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    });
    expect(response.statusCode).toBe(400);
  });

  test("correct spaceId returns all the element ", async () => {
    const response = await axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`, {
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    });
    expect(response.data.dimensions).toBe("100x200");
    expect(response.data.elements.length).toBe(3);
  });

  test("Delete endpoint is able to delete the elments  ", async () => {
    const response = await axios.get(`${BACKEND_URL}/api/v1/space/${spaceId}`, {
      headers: {
        authorization: `Bearer ${userToken}`,
      },
    });
    await axios.delete(
      `${BACKEND_URL}/api/v1/space/element`,
      {
        data: {
          id: response.data.elements[0].id,
        },
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    const newResponse = await axios.get(
      `${BACKEND_URL}/api/v1/space/${spaceId}`,
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    expect(newResponse.data.elements.length).toBe(2);
  });

  test("Adding an  element os fails if element lies outsiee the dimension  ", async () => {
    const newResponse = await axios.post(
      `${BACKEND_URL}/api/v1/space/element`,
      {
        elementId: element1Id,
        spaceId: spaceId,
        x: 5000,
        y: 100020,
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    expect(newResponse.statusCode).toBe(400);
  });

  test("Adding an element work as expected ", async () => {
    await axios.post(
      `${BACKEND_URL}/api/v1/space/element`,
      {
        elementId: element1Id,
        spaceId: spaceId,
        x: 50,
        y: 20,
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    const newResponse = await axios.get(
      `${BACKEND_URL}/api/v1/space/${spaceId}`,
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    expect(newResponse.data.elements.length).toBe(3);
  });
});
describe("Admin endpoints", () => {
  let adminToken;
  let adminId;
  let userToken;
  let userId;
  beforeAll(async () => {
    const username = `Gaurav-${Math.random()}`;
    const password = "123456";
    const singupResponse = await axios.post(`${BACKEND_URL}/api/v1/signup`, {
      username,
      password,
      type: "admin",
    });
    adminId = singupResponse.data.adminId;

    const response = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
      username,
      password,
    });

    adminToken = response.data.token;

    const UsersingupResponse = await axios.post(
      `${BACKEND_URL}/api/v1/singup`,
      {
        username: username + "-user",
        password,
        type: "user",
      },
    );
    userId = UsersingupResponse.data.userId;

    const Userresponse = await axios.post(`${BACKEND_URL}/api/v1/singin`, {
      username: username + "-user",
      password,
    });

    userToken = Userresponse.data.token;
  });

  test("User is not able to hit admin Endpoints", async () => {
    const element1Responce = await axios.post(
      `${BACKEND_URL}/api/v1/admin/element`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
        width: 1,
        height: 1,
        static: true,
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    const element2Responce = await axios.post(
      `${BACKEND_URL}/api/v1/admin/element`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
        width: 1,
        height: 1,
        static: true,
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    const mapResponce = await axios.post(
      `${BACKEND_URL}/api/v1/admin/map`,
      {
        thumbnail: "https://thumbnail.com/a.png",
        dimensions: "100x200",
        name: "100 person interview room",
        defaultElements: [],
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    const avatarResponse = await axios.post(
      `${BACKEND_URL}/api/v1/admin/avatar`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
        name: "Timmy",
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    const updateElement = await axios.put(
      `${BACKEND_URL}/api/v1/admin/element/:123`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );

    expect(element2Responce.statusCode).toBe(403);
    expect(element1Responce.statusCode).toBe(403);

    expect(mapResponce.statusCode).toBe(403);
    expect(avatarResponse.statusCode).toBe(403);
    expect(updateElement.statusCode).toBe(403);
  });

  test("Admin is  able to hit admin Endpoints", async () => {
    const element1Responce = await axios.post(
      `${BACKEND_URL}/api/v1/admin/element`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
        width: 1,
        height: 1,
        static: true,
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    const element2Responce = await axios.post(
      `${BACKEND_URL}/api/v1/admin/element`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
        width: 1,
        height: 1,
        static: true,
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    const mapResponce = await axios.post(
      `${BACKEND_URL}/api/v1/admin/map`,
      {
        thumbnail: "https://thumbnail.com/a.png",
        dimensions: "100x200",
        name: "100 person interview room",
        defaultElements: [],
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    const avatarResponse = await axios.post(
      `${BACKEND_URL}/api/v1/admin/avatar`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
        name: "Timmy",
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(element2Responce.statusCode).toBe(200);
    expect(element1Responce.statusCode).toBe(200);

    expect(mapResponce.statusCode).toBe(200);
    expect(avatarResponse.statusCode).toBe(200);
  });

  test("Admin is able to update the image url for an element", async () => {
    const elementResponce = await axios.post(
      `${BACKEND_URL}/api/v1/admin/element`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
        width: 1,
        height: 1,
        static: true,
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    const updateElement = await axios.put(
      `${BACKEND_URL}/api/v1/admin/element/${elementResponce.data.id}`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQm3RFDZM21teuCMFYx_AROjt-AzUwDBROFww&s",
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    expect(updateElement.statusCode).toBe(200);
  });
});

describe("websocket test",() => {
  let adminToken;
  let adminUserId;
  let userToken;
  let userId;
  let mapId;
  let element1Id;
  let element2Id;
  let spaceId;
  let ws1;
  let ws2;
  let ws1Messages = [];
  let ws2Messages = [];
 let userX;
 let userY;
 let AdminX;
 let AdminY;

  function waitForAndPopLatestMessage(messageArray){

    return new Promise(r => {
      if(messageArray.length > 0){
        resolve(messageArray.shift())
      } else {
         let interval =  setInterval(() => {
          if(messageArray.length > 0){
            resolve(messageArray.shift())
            clearInterval(interval)
          }
        },100)
      }
    })

  }

  async function setupHttp () {
     const username = `Gaurav-${Math.random()}`;
    const password = "123456";
    const singupResponse = await axios.post(`${BACKEND_URL}/api/v1/singup`, {
      username,
      password,
      type: "admin",
    });

    const signinResponse = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
      username,
      password,
    });

    adminUserId =singupResponse.data.id;
    adminToken = signinResponse.data.token;

    const UsersingupResponse = await axios.post(`${BACKEND_URL}/api/v1/singup`, {
      username : username + '-user',
      password,
      type: "admin",
    });

    const UsersigninResponse = await axios.post(`${BACKEND_URL}/api/v1/signin`, {
       username : username + '-user',
      password,
    });

    userId = UsersingupResponse.data.id;
    userToken = UsersigninResponse.data.token;

     const element1Responce = await axios.post(
      `${BACKEND_URL}/api/v1/admin/element`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
        width: 1,
        height: 1,
        static: true,
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    const element2Response = await axios.post(
      `${BACKEND_URL}/api/v1/admin/element`,
      {
        imageUrl:
          "https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcRCRca3wAR4zjPPTzeIY9rSwbbqB6bB2hVkoTXN4eerXOIkJTG1GpZ9ZqSGYafQPToWy_JTcmV5RHXsAsWQC3tKnMlH_CsibsSZ5oJtbakq&usqp=CAE",
        width: 1,
        height: 1,
        static: true,
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );

    element1Id = element1Responce.dats.id;
    element2Id = element2Response.data.id;

    const map = await axios.post(
      `${BACKEND_URL}/api/v1/admin/map`,
      {
        thumbnail: "https://thumbnail.com/a.png",
        dimensions: "100x200",
        name: "100 person interview room",
        defaultElements: [
          {
            elementId: element1Id,
            x: 20,
            y: 20,
          },
          {
            elementId: element1Id,
            x: 18,
            y: 20,
          },
          {
            elementId: element2Id,
            x: 19,
            y: 20,
          },
        ],
      },
      {
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      },
    );
    mapId = map.id;

    const spaceResponce = await axios.post(
      `${BACKEND_URL}/api/v1/space`,
      {
        name: "Test",
        dimensions: "100x200",
        mapId: mapId,
      },
      {
        headers: {
          authorization: `Bearer ${userToken}`,
        },
      },
    );
    spaceId = spaceResponce.data.spaceId;
  }

  function setupWebSocket () {
    ws1 = new WebSocket(WS_URL)

    await new Promise(r => {
      ws1.onopen = r
    })

 ws1.onmessage = (event) => {
      ws1Messages.push(JSON.parse(event.data))
    }
    ws2 = new WebSocket(WS_URL)

    await new Promise(r => {
      ws2.onopen = r
    })

    ws2.onmessage = (event) => {
      ws2Messages.push(JSON.parse(event.data))
    }

  }

  beforeAll(() => {
    setupHttp()
    setupWebSocket()

  })

  test("Get back ack for joining the space", async() => {
    ws1.send(JSON.stringify({
       "type": "join",
    "payload": {
	    "spaceId": spaceId,
	    "token": adminToken
    }
    }))
  const message1 = await waitForAndPopLatestMessage(ws1Messages);

     ws2.send(JSON.stringify({
       "type": "join",
    "payload": {
	    "spaceId": spaceId,
	    "token": userToken
    }
    }))

    const message2 = await waitForAndPopLatestMessage(ws2Messages);
    const message3 = await waitForAndPopLatestMessage(ws1Messages);

    expect(message1.type).toBe("space-joined")
     expect(message2.type).toBe("space-joined")

     expect(message1.payload.user.length ).toBe(0)
     expect(message2.payload.user.length ).toBe(1)
      expect(message3.type ).toBe('user-join')

      expect(message3.payload.x).toBe(message2.payload.spawn.x)
     expect(message3.payload.y).toBe(message2.payload.spawn.y)
     expect(message3.payload.userId).toBe(userId)

     AdminX = message1.payload.spawn.x
     AdminY = message1.payload.spawn.y

     userX = message2.payload.spawn.x
     userY = message2.payload.spawn.y

  })

  test("User should not be able to move across the boundary of the wall", async() => {
    ws1.send(JSON.stringify({
      type:"movement",
      payload:{
        x:100000,
        y:10000,
      }
    }))

    const message = await waitForAndPopLatestMessage(ws1Messages)

    expect(message.type).toBe("movement-rejcted")
    expect(message.payload.x).toBe(AdminX)
    expect(message.payload.y).toBe(AdminY)

  })

   test("User should not be able to move across the boundary of the wall", async() => {
    ws1.send(JSON.stringify({
      type:"movement",
      payload:{
        x:AdminX + 2,
        y:AdminY + 2,
      }
    }))

    const message = await waitForAndPopLatestMessage(ws1Messages)

    expect(message.type).toBe("movement-rejcted")
    expect(message.payload.x).toBe(AdminX)
    expect(message.payload.y).toBe(AdminY)

  })

   test("Correct movement should be brodcasted to the other sockets in the room", async() => {
    ws1.send(JSON.stringify({
      type:"movement",
      payload:{
        x:AdminX + 1,
        y:AdminY,
        userId: adminUserId
      }
    }))

    const message = await waitForAndPopLatestMessage(ws2Messages)

    expect(message.type).toBe("movement")
    expect(message.payload.x).toBe(AdminX +1)
    expect(message.payload.y).toBe(AdminY)

  })

    test("If the user leaves the other user receive a leave event", async() => {
    ws1.close();

    const message = await waitForAndPopLatestMessage(ws2Messages)

    expect(message.type).toBe("user-left")
    expect(message.payload.userId).toBe(adminUserId)

  })

} )
