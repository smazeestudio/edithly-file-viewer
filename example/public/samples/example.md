# Example Markdown

This sample helps verify the markdown renderer.

- Bullet one
- Bullet two
- Bullet three

## Code Sample

```ts
type User = {
  id: string;
  active: boolean;
};

export function greet(user: User) {
  return user.active ? `Hello, ${user.id}` : "Inactive user";
}
```
