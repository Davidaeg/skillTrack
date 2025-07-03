export const schema = `
  enum Role {
    USER
    ADMIN
  }

  type User {
    id: ID!
    name: String
    email: String!
    role: Role!
  }

  type Module {
    id: ID!
    title: String!
    description: String!
    createdAt: String!
    updatedAt: String!
  }

  type UserModule {
    id: ID!
    module: Module!
    progress: Int!
  }

  type Query {
    me: User
    modules: [Module!]!
    myProgress: [UserModule!]!
  }

  type Mutation {
    createModule(title: String!, description: String!): Module!
    updateProgress(moduleId: ID!, progress: Int!): UserModule!
  }
`;
